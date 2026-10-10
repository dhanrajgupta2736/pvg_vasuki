"""
VASUKI — Autonomous Security Sentinel
FastAPI Entry Point
"""
import os
import shutil
import glob
from pathlib import Path

# Auto-detect Git executable if not already in PATH
if not shutil.which("git"):
    candidates = [
        os.path.expandvars(r"%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\git.exe"),
        r"C:\Program Files\Git\cmd\git.exe",
        r"C:\Program Files (x86)\Git\cmd\git.exe",
    ]
    for pattern in candidates:
        matches = glob.glob(pattern)
        if matches:
            git_exe = matches[0]
            os.environ["GIT_PYTHON_GIT_EXECUTABLE"] = git_exe
            os.environ["PATH"] = os.path.dirname(git_exe) + os.pathsep + os.environ.get("PATH", "")
            break

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.database import init_db
from core.database import AsyncSessionLocal
from models.scan_job import ScanJob, ScanStatus
from sqlalchemy import update
from api.routes import analysis, health, reports, websocket_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    async with AsyncSessionLocal() as db:
        await db.execute(update(ScanJob).where(ScanJob.status.in_([
            ScanStatus.PENDING, ScanStatus.SCANNING, ScanStatus.PATCHING, ScanStatus.REVIEWING, ScanStatus.TESTING, ScanStatus.DEPLOYING
        ])).values(status=ScanStatus.FAILED, error_message="Server restarted during this run; retry the scan"))
        await db.commit()
    yield
    # Shutdown (cleanup if needed)


app = FastAPI(
    title="VASUKI — Autonomous Security Sentinel",
    description="Multi-Agent CVE Detection, Patching, and Validation Pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router,    prefix="/api",           tags=["Health"])
app.include_router(analysis.router,  prefix="/api/analysis",  tags=["Analysis"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["Reports"])
app.include_router(websocket_routes.router, prefix="/ws",     tags=["WebSocket"])


frontend_dist = Path(__file__).resolve().parents[1] / 'frontend' / 'dist'
if frontend_dist.exists():
    app.mount('/', StaticFiles(directory=frontend_dist, html=True), name='dashboard')
else:
    @app.get('/')
    async def root():
        return {'name': 'VASUKI', 'status': 'operational', 'dashboard': 'Build frontend to serve the UI'}
