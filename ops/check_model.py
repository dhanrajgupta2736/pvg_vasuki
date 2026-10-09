"""Warm and verify real OCI inference from the API container."""
import asyncio
from services.llm_client import call_llm, configured_model

async def main():
    print('Verifying ' + configured_model(), flush=True)
    text = await call_llm('Reply with READY only.', 'Connectivity check.', max_tokens=256)
    print('Real inference result: ' + text.strip(), flush=True)

asyncio.run(main())
