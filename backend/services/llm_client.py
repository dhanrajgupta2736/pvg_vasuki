"""Real model inference. An unavailable model is an error, never an approval."""
import asyncio
import os
import httpx
from core.config import settings

def configured_model():
    return 'groq/llama-3.3-70b-versatile' if settings.GROQ_API_KEY else 'oci/' + settings.OCI_GENAI_MODEL_ID

async def call_llm(system_prompt, user_prompt, max_tokens=4096, temperature=0.1, json_mode=False):
    if not settings.USE_LLM:
        raise RuntimeError('Model inference is disabled')
    if settings.GROQ_API_KEY:
        payload = {'model':'llama-3.3-70b-versatile','messages':[{'role':'system','content':system_prompt},
            {'role':'user','content':user_prompt}],'max_tokens':max_tokens,'temperature':temperature}
        if json_mode:
            payload['response_format'] = {'type':'json_object'}
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            response = await client.post('https://api.groq.com/openai/v1/chat/completions',
                headers={'Authorization':f'Bearer {settings.GROQ_API_KEY}'},json=payload)
            if response.status_code != 200:
                raise RuntimeError(f'Groq inference failed ({response.status_code})')
            return response.json()['choices'][0]['message']['content']
    return await asyncio.wait_for(asyncio.to_thread(_oci_chat, system_prompt, user_prompt, max_tokens, temperature),
                                  timeout=settings.LLM_TIMEOUT_SECONDS + 5)

def _oci_chat(system_prompt, user_prompt, max_tokens, temperature):
    import oci
    from oci.generative_ai_inference import models as m
    signer = None
    if settings.OCI_AUTH_MODE == 'instance_principal':
        signer = oci.auth.signers.InstancePrincipalsSecurityTokenSigner()
        config = {'region': signer.region, 'tenancy': signer.tenancy_id}
    else:
        config = oci.config.from_file(os.path.expanduser(settings.OCI_CONFIG_FILE),settings.OCI_CONFIG_PROFILE)
    client = oci.generative_ai_inference.GenerativeAiInferenceClient(config,
        service_endpoint=settings.OCI_GENAI_ENDPOINT,timeout=(10,settings.LLM_TIMEOUT_SECONDS),
        retry_strategy=oci.retry.NoneRetryStrategy(), **({'signer': signer} if signer else {}))
    request = m.GenericChatRequest(api_format='GENERIC',max_tokens=max_tokens,temperature=temperature,
        messages=[m.SystemMessage(content=[m.TextContent(text=system_prompt)]),
                  m.UserMessage(content=[m.TextContent(text=user_prompt)])])
    details = m.ChatDetails(compartment_id=settings.OCI_COMPARTMENT_ID or config['tenancy'],
        serving_mode=m.OnDemandServingMode(model_id=settings.OCI_GENAI_MODEL_ID),chat_request=request)
    try:
        result = client.chat(details).data.chat_response
    except oci.exceptions.ServiceError as exc:
        raise RuntimeError(f'OCI inference failed ({exc.status}: {exc.code})') from None
    choices = getattr(result, 'choices', None) or []
    message = getattr(choices[0], 'message', None) if choices else None
    content = ''.join(getattr(part,'text','') or '' for part in (getattr(message, 'content', None) or []))
    if not content.strip():
        raise RuntimeError('Model returned an empty patch')
    return content
