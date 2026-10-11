"""
Global configuration — loaded from .env
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    # GitHub
    GITHUB_TOKEN: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_OAUTH_REDIRECT_URI: str = ""
    GITHUB_APP_ID: str = ""
    GITHUB_APP_PRIVATE_KEY_PATH: str = "./github_app.pem"

    # Oracle OCI Gen AI
    OCI_CONFIG_FILE: str = "~/.oci/config"
    OCI_CONFIG_PROFILE: str = "DEFAULT"
    OCI_AUTH_MODE: str = "config"
    OCI_COMPARTMENT_ID: str = ""
    OCI_GENAI_ENDPOINT: str = "https://inference.generativeai.ap-mumbai-1.oci.oraclecloud.com"
    OCI_GENAI_MODEL_ID: str = "google.gemini-2.5-flash"

    # AWS Bedrock (backup)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_BEDROCK_MODEL_ID: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"

    # Groq
    GROQ_API_KEY: str = ""

    # Database (defaults to local async SQLite for zero-config run)
    DATABASE_URL: str = f"sqlite+aiosqlite:///{(BACKEND_DIR / 'vasuki.db').as_posix()}"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    APP_SECRET: str = "changeme"
    FRONTEND_URL: str = "http://localhost:5173"
    MAX_REPO_SIZE_MB: int = 100
    SCAN_TIMEOUT_SECONDS: int = 300
    DOCKER_SANDBOX_IMAGE: str = "python:3.11-slim"
    ARTIFACTS_DIR: str = str(BACKEND_DIR / "artifacts")
    MAX_PATCHES: int = 10
    MAX_REPAIR_ROUNDS: int = 6
    MAX_PATCH_CHANGED_LINES: int = 120
    MAX_TOTAL_CHANGED_LINES: int = 200
    MAX_PATCH_CHANGE_RATIO: float = 0.65
    LLM_TIMEOUT_SECONDS: int = 60
    USE_LLM: bool = True
    SCANNER_MODE: str = "native"
    N8N_WEBHOOK_URL: str = ""
    N8N_WEBHOOK_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"), env_file_encoding="utf-8", extra="ignore")


settings = Settings()
