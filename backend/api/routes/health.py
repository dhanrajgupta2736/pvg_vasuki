"""Health check routes"""
from fastapi import APIRouter
from core.redis_client import get_redis

router = APIRouter()


@router.get("/health")
async def health():
    try:
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    
    return {
        "status": "healthy" if redis_ok else "degraded",
        "service": "VASUKI API",
        "redis": "ok" if redis_ok else "error",
    }
