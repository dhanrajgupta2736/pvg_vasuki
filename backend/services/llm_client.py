"""
LLM Client — Groq (Primary) with AWS Bedrock fallback
Uses Llama 3.3 70B via Groq for ultra-fast inference (~2-3s vs 15-20s on OCI)
"""
import os
from groq import Groq
from core.config import settings

_groq_client = None


def get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 4096,
    temperature: float = 0.1,
    json_mode: bool = False,
) -> str:
    """
    Unified LLM call — uses Groq (Llama 3.3 70B) as primary.
    Falls back to AWS Bedrock (Claude 3.5 Sonnet) if Groq fails.
    """
    import asyncio

    loop = asyncio.get_event_loop()

    def _sync_groq():
        client = get_groq_client()
        kwargs = dict(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content

    try:
        return await loop.run_in_executor(None, _sync_groq)
    except Exception as groq_err:
        print(f"[LLM] Groq failed: {groq_err} — trying AWS Bedrock fallback...")
        return await _call_bedrock_fallback(system_prompt, user_prompt, max_tokens, temperature)


async def _call_bedrock_fallback(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 4096,
    temperature: float = 0.1,
) -> str:
    """AWS Bedrock (Claude 3.5 Sonnet) fallback."""
    import asyncio, json, boto3

    loop = asyncio.get_event_loop()

    def _sync_bedrock():
        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        })
        resp = client.invoke_model(
            modelId=settings.AWS_BEDROCK_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        result = json.loads(resp["body"].read())
        return result["content"][0]["text"]

    return await loop.run_in_executor(None, _sync_bedrock)
