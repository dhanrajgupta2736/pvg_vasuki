"""
Database models for VASUKI
"""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, JSON, Float, Integer, Text, Enum

from core.database import Base


class ScanStatus(str, PyEnum):
    PENDING   = "pending"
    SCANNING  = "scanning"
    PATCHING  = "patching"
    REVIEWING = "reviewing"
    TESTING   = "testing"
    DEPLOYING = "deploying"
    COMPLETED = "completed"
    FAILED    = "failed"
    BLOCKED   = "blocked"


class AgentStatus(str, PyEnum):
    IDLE      = "idle"
    RUNNING   = "running"
    DONE      = "done"
    ERROR     = "error"


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id            = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_url      = Column(String(512), nullable=False)
    branch        = Column(String(128), default="main")
    status        = Column(Enum(ScanStatus), default=ScanStatus.PENDING)

    # Agent statuses
    agent_scanner  = Column(Enum(AgentStatus), default=AgentStatus.IDLE)
    agent_patcher  = Column(Enum(AgentStatus), default=AgentStatus.IDLE)
    agent_reviewer = Column(Enum(AgentStatus), default=AgentStatus.IDLE)
    agent_tester   = Column(Enum(AgentStatus), default=AgentStatus.IDLE)

    # Results
    vulnerabilities = Column(JSON, default=list)   # List of found vulns
    patches         = Column(JSON, default=list)   # List of generated patches
    review_notes    = Column(JSON, default=dict)   # Reviewer analysis
    test_results    = Column(JSON, default=dict)   # Test pass/fail report
    confidence_score = Column(Float, default=0.0)  # 0-100
    blast_radius    = Column(JSON, default=list)   # Affected files/modules
    pr_url          = Column(String(512), default="")
    pr_number       = Column(Integer, default=0)

    # Logs
    error_message   = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
