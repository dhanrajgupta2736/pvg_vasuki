"""
WebSocket route — real-time agent event streaming to frontend
Client connects to: ws://host/ws/scan/{scan_id}
"""
import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.redis_client import subscribe_scan_events

router = APIRouter()


@router.websocket("/scan/{scan_id}")
async def scan_websocket(websocket: WebSocket, scan_id: str):
    """
    Stream real-time agent events to the frontend.
    Works seamlessly with Redis or In-Memory fallback.
    """
    await websocket.accept()

    await websocket.send_json({
        "agent": "system",
        "message": f"Connected to VASUKI scan stream: {scan_id}",
        "level": "info",
        "data": {},
    })

    try:
        async for event in subscribe_scan_events(scan_id):
            await websocket.send_json(event)

            # Close WebSocket when pipeline completes or fails
            if event.get("data", {}).get("status") in ("completed", "failed"):
                await websocket.send_json({
                    "agent": "system",
                    "message": "Pipeline finished. Closing stream.",
                    "level": "info",
                    "data": {},
                })
                break

    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
