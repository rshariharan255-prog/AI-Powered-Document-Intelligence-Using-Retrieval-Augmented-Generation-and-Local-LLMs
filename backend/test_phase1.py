import sys
from fastapi.testclient import TestClient
from main import app

def run_phase1_verification():
    print("=" * 60)
    print("PHASE 1 VERIFICATION TEST: LOCAL RAG DOCUMENT ASSISTANT")
    print("=" * 60)
    
    client = TestClient(app)
    
    # 1. Test Root Endpoint
    print("\n[1/3] Testing Root Endpoint GET / ...")
    response = client.get("/")
    assert response.status_code == 200, f"Root failed: {response.text}"
    print(f"[OK] Root OK: {response.json()}")
    
    # 2. Test Health Endpoint
    print("\n[2/3] Testing Health Endpoint GET /health ...")
    response = client.get("/health")
    assert response.status_code == 200, f"Health check failed: {response.text}"
    data = response.json()
    print(f"[OK] Backend Status: {data.get('status')}")
    print(f"[OK] Ollama Server Connected: {data.get('ollama')}")
    print(f"[OK] Gemma 2B Model Available: {data.get('model_available')}")
    print(f"[OK] Target Model: {data.get('target_model')}")
    
    assert data.get("ollama") is True, "Ollama is not reachable at http://localhost:11434"
    assert data.get("model_available") is True, "Model gemma:2b is not found in Ollama"
    
    # 3. Test LLM Generation
    print("\n[3/3] Testing LLM Generation POST /api/test-llm ...")
    test_prompt = "Explain in one sentence what Retrieval-Augmented Generation (RAG) is."
    print(f"Prompt sent to Gemma 2B: \"{test_prompt}\"")
    
    response = client.post("/api/test-llm", json={"prompt": test_prompt})
    assert response.status_code == 200, f"LLM test failed: {response.text}"
    result = response.json()
    
    print("\n--- GEMMA 2B RESPONSE ---")
    print(result.get("response"))
    print("------------------------")
    print(f"[OK] Tokens Generated: {result.get('eval_count')}")
    print(f"[OK] Success: {result.get('success')}")
    
    print("\n" + "=" * 60)
    print("ALL PHASE 1 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_phase1_verification()
