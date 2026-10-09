"""
Redis client + in-memory fallback for zero-downtime execution
"""
import asyncio
import json
from collections import defaultdict
from typing import Optional, AsyncGenerator

import redis.asyncio as aioredis
from core.config import settings

_redis_client = None
_redis_available = None


class InMemoryBus:
    """Fallback in-process pub/sub event bus when Redis is unavailable."""
    def __init__(self):
        self._channels = defaultdict(list)
        self._states = {}

    def subscribe(self, channel: str) -> asyncio.Queue:
        q = asyncio.Queue()
        self._channels[channel].append(q)
        return q

    def unsubscribe(self, channel: str, q: asyncio.Queue):
        if channel in self._channels and q in self._channels[channel]:
            self._channels[channel].remove(q)

    async def publish(self, channel: str, message: str):
        for q in list(self._channels.get(channel, [])):
            await q.put(message)

    def set_state(self, key: str, value: str):
        self._states[key] = value

    def get_state(self, key: str) -> Optional[str]:
        return self._states.get(key)


_mem_bus = InMemoryBus()


async def is_redis_available() -> bool:
    global _redis_available, _redis_client
    if _redis_available is not None:
        return _redis_available
    try:
        if _redis_client is None:
            _redis_client = await aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1.0,
            )
        await _redis_client.ping()
        _redis_available = True
    except Exception:
        _redis_available = False
    return _redis_available


async def get_redis():
    global _redis_client
    if await is_redis_available():
        return _redis_client
    return None


async def publish_event(scan_id: str, event: dict):
    """Publish an agent event for WebSocket streaming."""
    channel = f"vasuki:scan:{scan_id}"
    msg = json.dumps(event)
    if await is_redis_available():
        try:
            r = await get_redis()
            await r.publish(channel, msg)
            return
        except Exception:
            pass
    # In-memory fallback
    await _mem_bus.publish(channel, msg)


async def set_scan_state(scan_id: str, state: dict, ttl: int = 86400):
    key = f"vasuki:state:{scan_id}"
    val = json.dumps(state)
    if await is_redis_available():
        try:
            r = await get_redis()
            await r.set(key, val, ex=ttl)
            return
        except Exception:
            pass
    _mem_bus.set_state(key, val)


async def get_scan_state(scan_id: str) -> Optional[dict]:
    key = f"vasuki:state:{scan_id}"
    if await is_redis_available():
        try:
            r = await get_redis()
            raw = await r.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            pass
    raw = _mem_bus.get_state(key)
    return json.loads(raw) if raw else None


async def subscribe_scan_events(scan_id: str) -> AsyncGenerator[dict, None]:
    """Universal event subscriber generator for WebSockets."""
    channel = f"vasuki:scan:{scan_id}"
    if await is_redis_available():
        r = await get_redis()
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        yield json.loads(message["data"])
                    except json.JSONDecodeError:
                        pass
        finally:
            await pubsub.unsubscribe(channel)
    else:
        q = _mem_bus.subscribe(channel)
        try:
            while True:
                msg = await q.get()
                try:
                    yield json.loads(msg)
                except json.JSONDecodeError:
                    pass
        finally:
            _mem_bus.unsubscribe(channel, q)
