"""
Redis client + pub/sub helper for real-time WebSocket updates
"""
import json
import redis.asyncio as aioredis
from core.config import settings

_redis_client = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def publish_event(scan_id: str, event: dict):
    """Publish an agent event to a Redis channel for WebSocket streaming."""
    r = await get_redis()
    await r.publish(f"vasuki:scan:{scan_id}", json.dumps(event))


async def set_scan_state(scan_id: str, state: dict, ttl: int = 86400):
    """Persist current scan state in Redis."""
    r = await get_redis()
    await r.set(f"vasuki:state:{scan_id}", json.dumps(state), ex=ttl)


async def get_scan_state(scan_id: str) -> dict | None:
    r = await get_redis()
    raw = await r.get(f"vasuki:state:{scan_id}")
    return json.loads(raw) if raw else None
