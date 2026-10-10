"""Actual capability reporting; configured credentials are never called authenticated."""
import asyncio
import os
from fastapi import APIRouter
from sqlalchemy import text
from core.config import settings
from core.database import AsyncSessionLocal
from core.redis_client import is_redis_available
from services.llm_client import configured_model

router=APIRouter()

def docker_status():
    client = None
    try:
        import docker
        client = docker.from_env(timeout=3)
        client.ping()
        return True
    except Exception:
        return False
    finally:
        if client is not None:
            client.close()

@router.get('/health')
async def health():
    async with AsyncSessionLocal() as db:
        await db.execute(text('SELECT 1'))
    container_ready=await asyncio.to_thread(docker_status)
    return {'status':'healthy','database':'connected','redis':'connected' if await is_redis_available() else 'in-memory',
            'docker_available':container_ready,'github_configured':bool(settings.GITHUB_TOKEN),
            'model':configured_model(),'model_configured':settings.USE_LLM and (bool(settings.GROQ_API_KEY) or settings.OCI_AUTH_MODE=='instance_principal' or os.path.exists(os.path.expanduser(settings.OCI_CONFIG_FILE))),
            'n8n_configured':bool(settings.N8N_WEBHOOK_URL),'bundled_demo_available':True,
            'scanner':settings.SCANNER_MODE,'external_scan_ready':True}
