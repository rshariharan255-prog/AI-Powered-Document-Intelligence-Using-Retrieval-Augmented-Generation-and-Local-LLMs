import pymupdf
from fastapi.testclient import TestClient
from main import app

def create_sample_ml_pdf() -> bytes:
    doc = pymupdf.open()
    
    # Page 1
    p1 = doc.new_page()
    p1.insert_text((50, 72), "Machine Learning Overview\nMachine learning is a subset of artificial intelligence focused on building mathematical algorithms that learn from experience.", fontsize=12)
    
    # Page 2
    p2 = doc.new_page()
    p2.insert_text((50, 72), "Supervised Learning Fundamentals\nSupervised learning algorithms build a mathematical model of a set of data that contains both the inputs and the desired labels. Common applications include classification and regression.", fontsize=12)
    
    # Page 3
    p3 = doc.new_page()
    p3.insert_text((50, 72), "Evaluation Metrics\nClassification algorithms are evaluated using Accuracy, Precision, Recall, and F1-Score to measure true positive and false positive rates.", fontsize=12)
    
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def run_rag_pipeline_test():
    print("=" * 65)
    print("END-TO-END RAG PIPELINE VERIFICATION TEST")
    print("=" * 65)
    
    client = TestClient(app)
    
    # 1. Upload & Index PDF
    print("\n[1/4] Ingesting & Indexing Machine Learning Document (POST /upload)...")
    pdf_bytes = create_sample_ml_pdf()
    upload_res = client.post(
        "/upload",
        files={"file": ("Machine_Learning_Notes.pdf", pdf_bytes, "application/pdf")}
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    doc_info = upload_res.json()
    doc_id = doc_info["document_id"]
    print(f"[OK] Document ID: {doc_id}")
    print(f"[OK] Pages: {doc_info['pages']}, Chunks: {doc_info['chunks']}")

    # 2. Test Grounded Document Question
    print("\n[2/4] Testing In-Document Question (POST /ask)...")
    q1 = "What does supervised learning build?"
    print(f"Question: \"{q1}\"")
    ask_res1 = client.post("/ask", json={"document_id": doc_id, "question": q1, "debug_mode": True})
    assert ask_res1.status_code == 200, f"Ask failed: {ask_res1.text}"
    data1 = ask_res1.json()
    
    print("\n--- GEMMA 2B ANSWER ---")
    print(data1["answer"])
    print("-----------------------")
    print(f"[OK] Grounded: {data1['is_grounded']}")
    print(f"[OK] Sources ({len(data1['sources'])}):")
    for s in data1["sources"]:
        print(f"     - File: {s['document']}, Page: {s['page']}, Score: {s['score']}")
    
    assert data1["is_grounded"] is True
    assert len(data1["sources"]) > 0
    # Page 2 contains supervised learning details
    assert any(s["page"] == 2 for s in data1["sources"]), "Expected citation from Page 2"

    # 3. Test Semantic Similarity Retrieval
    print("\n[3/4] Testing Semantic Rephrase Question (POST /ask)...")
    q2 = "How are classification algorithms assessed?"
    print(f"Question: \"{q2}\"")
    ask_res2 = client.post("/ask", json={"document_id": doc_id, "question": q2})
    assert ask_res2.status_code == 200
    data2 = ask_res2.json()
    print("\n--- GEMMA 2B ANSWER ---")
    print(data2["answer"])
    print("-----------------------")
    assert any(s["page"] == 3 for s in data2["sources"]), "Expected citation from Page 3 (Metrics)"
    print("[OK] Correctly retrieved Page 3 semantic chunks and cited source.")

    # 4. Test Out-of-Document Question (Relevance Threshold Check)
    print("\n[4/4] Testing Out-of-Document Question (POST /ask)...")
    q3 = "What is the capital of France?"
    print(f"Question: \"{q3}\"")
    ask_res3 = client.post("/ask", json={"document_id": doc_id, "question": q3, "debug_mode": True})
    assert ask_res3.status_code == 200
    data3 = ask_res3.json()
    print("\n--- SYSTEM RESPONSE ---")
    print(data3["answer"])
    print("-----------------------")
    assert "couldn't find enough relevant information" in data3["answer"].lower()
    assert data3["is_grounded"] is False
    assert len(data3["sources"]) == 0
    print("[OK] Out-of-document question safely rejected without hallucination.")

    print("\n" + "=" * 65)
    print("ALL END-TO-END RAG PIPELINE TESTS PASSED PERFECTLY!")
    print("=" * 65)

if __name__ == "__main__":
    run_rag_pipeline_test()
