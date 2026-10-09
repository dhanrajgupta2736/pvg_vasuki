"""Health check routes"""
from fastapi import APIRouter
from core.redis_client import is_redis_available

router = APIRouter()


@router.get("/health")
async def health():
    redis_live = await is_redis_available()
    return {
        "status": "healthy",
        "service": "VASUKI Autonomous Security Sentinel",
        "version": "1.0.0",
        "redis": "connected" if redis_live else "in-memory-fallback",
        "oci_status": "authenticated",
    }
