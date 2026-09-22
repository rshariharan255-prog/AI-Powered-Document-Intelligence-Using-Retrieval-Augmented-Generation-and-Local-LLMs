import io
import pymupdf
from fastapi.testclient import TestClient
from main import app

def create_sample_pdf() -> bytes:
    """Create a real 3-page PDF document in memory using PyMuPDF."""
    doc = pymupdf.open()
    
    # Page 1: Overview
    page1 = doc.new_page()
    page1.insert_text(
        (50, 72),
        "Machine Learning Overview\n\n"
        "Machine learning is a subset of artificial intelligence focused on building systems "
        "that learn from data. The primary paradigms are supervised learning, unsupervised learning, "
        "and reinforcement learning.",
        fontsize=12
    )
    
    # Page 2: Supervised Learning
    page2 = doc.new_page()
    page2.insert_text(
        (50, 72),
        "Supervised Learning Details\n\n"
        "Supervised learning is an approach where a model learns from labeled training data. "
        "The algorithm learns a mapping function from input features to desired outputs. "
        "Common tasks include classification (predicting discrete labels) and regression "
        "(predicting continuous values).",
        fontsize=12
    )
    
    # Page 3: Evaluation Metrics
    page3 = doc.new_page()
    page3.insert_text(
        (50, 72),
        "Model Evaluation Metrics\n\n"
        "To evaluate machine learning models, several metrics are utilized: "
        "Accuracy, Precision, Recall, and F1-Score. For regression models, common metrics "
        "include Mean Squared Error (MSE) and R-squared.",
        fontsize=12
    )
    
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def create_empty_pdf() -> bytes:
    """Create a PDF with 2 blank pages (no extractable text)."""
    doc = pymupdf.open()
    doc.new_page()
    doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def run_phase2_verification():
    print("=" * 60)
    print("PHASE 2 VERIFICATION TEST: PDF TEXT EXTRACTION & METADATA")
    print("=" * 60)
    
    client = TestClient(app)
    
    # Test 1: Upload and Extract Real Multi-Page PDF
    print("\n[1/3] Testing Valid 3-Page PDF Upload (POST /upload) ...")
    sample_pdf_bytes = create_sample_pdf()
    
    response = client.post(
        "/upload",
        files={"file": ("Machine_Learning_Notes.pdf", sample_pdf_bytes, "application/pdf")}
    )
    
    assert response.status_code == 200, f"Upload failed: {response.text}"
    data = response.json()
    
    print(f"[OK] Document ID: {data.get('document_id')}")
    print(f"[OK] Filename: {data.get('filename')}")
    print(f"[OK] Total Pages: {data.get('total_pages')}")
    print(f"[OK] Total Characters: {data.get('total_characters')}")
    
    assert data.get("total_pages") == 3, f"Expected 3 pages, got {data.get('total_pages')}"
    pages = data.get("pages", [])
    assert len(pages) == 3, f"Expected 3 page objects, got {len(pages)}"
    
    # Verify Page Metadata and Page-Specific Text
    print("\n--- EXTRACTED PAGE METADATA VERIFICATION ---")
    for p in pages:
        page_num = p["page_number"]
        text_snippet = p["text"].replace('\n', ' ')[:65]
        print(f"Page {page_num}: \"{text_snippet}...\" ({p['char_count']} chars)")
        
        if page_num == 1:
            assert "Machine Learning Overview" in p["text"]
        elif page_num == 2:
            assert "Supervised Learning Details" in p["text"]
        elif page_num == 3:
            assert "Model Evaluation Metrics" in p["text"]
            
    print("[OK] All page numbers and textual contents accurately preserved.")

    # Test 2: Upload Non-PDF File (Validation check)
    print("\n[2/3] Testing Invalid Non-PDF File Rejection ...")
    invalid_response = client.post(
        "/upload",
        files={"file": ("notes.txt", b"This is a plain text file.", "text/plain")}
    )
    assert invalid_response.status_code == 400, "Should reject non-PDF file"
    print(f"[OK] Correctly rejected with status 400: {invalid_response.json().get('detail')}")

    # Test 3: Upload Empty PDF without extractable text
    print("\n[3/3] Testing Blank/Scanned PDF Rejection ...")
    empty_pdf_bytes = create_empty_pdf()
    empty_response = client.post(
        "/upload",
        files={"file": ("blank.pdf", empty_pdf_bytes, "application/pdf")}
    )
    assert empty_response.status_code == 400, "Should reject empty PDF"
    print(f"[OK] Correctly rejected with status 400: {empty_response.json().get('detail')}")

    print("\n" + "=" * 60)
    print("ALL PHASE 2 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_phase2_verification()
