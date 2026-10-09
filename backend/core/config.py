"""
Global configuration — loaded from .env
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # GitHub
    GITHUB_TOKEN: str = ""
    GITHUB_APP_ID: str = ""
    GITHUB_APP_PRIVATE_KEY_PATH: str = "./github_app.pem"

    # Oracle OCI Gen AI
    OCI_CONFIG_FILE: str = "~/.oci/config"
    OCI_CONFIG_PROFILE: str = "DEFAULT"
    OCI_COMPARTMENT_ID: str = ""
    OCI_GENAI_ENDPOINT: str = "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com"
    OCI_GENAI_MODEL_ID: str = "meta.llama-3-3-70b-instruct"

    # AWS Bedrock (backup)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_BEDROCK_MODEL_ID: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://vasuki:vasuki_pass@localhost:5432/vasuki_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    APP_SECRET: str = "changeme"
    FRONTEND_URL: str = "http://localhost:5173"
    MAX_REPO_SIZE_MB: int = 500
    SCAN_TIMEOUT_SECONDS: int = 300
    DOCKER_SANDBOX_IMAGE: str = "python:3.11-slim"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
