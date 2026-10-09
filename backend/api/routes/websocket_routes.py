"""
WebSocket route — real-time agent event streaming to frontend
Client connects to: ws://host/ws/scan/{scan_id}
"""
import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis

from core.config import settings
from core.redis_client import get_redis

router = APIRouter()


@router.websocket("/scan/{scan_id}")
async def scan_websocket(websocket: WebSocket, scan_id: str):
    """
    Stream real-time agent events to the frontend.
    Subscribes to Redis pub/sub channel: vasuki:scan:{scan_id}
    """
    await websocket.accept()
    
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe(f"vasuki:scan:{scan_id}")
    
    await websocket.send_json({
        "agent": "system",
        "message": f"Connected to VASUKI scan stream: {scan_id}",
        "level": "info",
        "data": {},
    })
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    event = json.loads(message["data"])
                    await websocket.send_json(event)
                    
                    # Close WebSocket when pipeline completes or fails
                    if event.get("data", {}).get("status") in ("completed", "failed"):
                        await websocket.send_json({"agent": "system", "message": "Pipeline finished. Closing stream.", "level": "info", "data": {}})
                        break
                except json.JSONDecodeError:
                    pass
    
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"vasuki:scan:{scan_id}")
        await websocket.close()
