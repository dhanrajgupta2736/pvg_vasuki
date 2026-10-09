"""
VASUKI — OCI Connection Test
Run this after uploading the API key to Oracle Cloud:
  python scripts/test_oci_connection.py
"""
import sys

print("🔍 Testing OCI connection...\n")

# 1. Test SDK import
try:
    import oci
    print(f"✅ OCI SDK installed: v{oci.__version__}")
except ImportError:
    print("❌ OCI SDK not installed. Run: pip install oci")
    sys.exit(1)

# 2. Test config load
try:
    config = oci.config.from_file("~/.oci/config", "DEFAULT")
    oci.config.validate_config(config)
    print(f"✅ OCI config loaded")
    print(f"   Tenancy : {config['tenancy'][:30]}...")
    print(f"   User    : {config['user'][:30]}...")
    print(f"   Region  : {config['region']}")
    print(f"   Fingerprint: {config['fingerprint']}")
except Exception as e:
    print(f"❌ Config error: {e}")
    sys.exit(1)

# 3. Test Identity API (proves auth works)
try:
    identity = oci.identity.IdentityClient(config)
    tenancy  = identity.get_tenancy(config["tenancy"]).data
    print(f"\n✅ AUTH SUCCESSFUL!")
    print(f"   Tenancy Name: {tenancy.name}")
    print(f"   Home Region : {tenancy.home_region_key}")
except oci.exceptions.ServiceError as e:
    print(f"\n❌ Auth failed (HTTP {e.status}): {e.message}")
    if e.status == 401:
        print("   → Public key not yet uploaded to Oracle Cloud, or fingerprint mismatch")
    sys.exit(1)

# 4. Test OCI Gen AI endpoint availability
print("\n🔍 Checking OCI Generative AI availability...")
try:
    from oci.generative_ai_inference import GenerativeAiInferenceClient
    from oci.generative_ai_inference.models import (
        ChatDetails, OnDemandServingMode, GenericChatRequest,
        UserMessage, TextContent
    )
    # Use Chicago endpoint for Gen AI
    genai_config = config.copy()
    genai_config["region"] = "us-chicago-1"

    client = GenerativeAiInferenceClient(
        config=genai_config,
        service_endpoint="https://inference.generativeai.us-chicago-1.oci.oraclecloud.com"
    )

    # Quick test call
    req = GenericChatRequest(
        messages=[UserMessage(content=[TextContent(text="Say VASUKI in one word.")])],
        max_tokens=5,
        temperature=0.1,
    )
    detail = ChatDetails(
        serving_mode=OnDemandServingMode(model_id="meta.llama-3-3-70b-instruct"),
        compartment_id=config["tenancy"],   # Use tenancy as compartment for test
        chat_request=req,
    )
    resp   = client.chat(detail)
    answer = resp.data.chat_response.choices[0].message.content[0].text
    print(f"✅ OCI Gen AI (Llama 3.3 70B) is LIVE!")
    print(f"   Test response: {answer.strip()}")

except Exception as e:
    print(f"⚠️  Gen AI test: {e}")
    print("   (This is OK if you haven't enabled Gen AI in your tenancy yet)")

print("\n🏆 OCI setup complete! VASUKI is ready to use Oracle Cloud.")
