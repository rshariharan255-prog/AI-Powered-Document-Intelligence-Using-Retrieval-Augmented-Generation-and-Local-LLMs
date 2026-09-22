# Local AI-Powered Document Question Answering System using Retrieval-Augmented Generation (RAG)

**Short Title:** Local RAG Document Assistant  
**Academic Level:** 3rd Year B.E. (AI & ML) Project  

---

## 📌 1. Project Overview

**Local RAG Document Assistant** is a 100% private, locally hosted document question-answering system. It allows users to upload PDF documents, automatically parses and indexes their contents into a local vector database, and answers user questions grounded strictly in the uploaded document's context using a local Large Language Model (Gemma 2B via Ollama).

### Key Highlights
- **100% Local Execution**: No OpenAI, Gemini, or Claude API keys needed. No document data leaves your computer.
- **Accurate Source Attribution**: Every generated answer cites the exact original page numbers and cosine similarity scores.
- **Strict Anti-Hallucination & Prompt Guard**: Protects against prompt injection and rejects questions when the document lacks sufficient supporting evidence.
- **Live RAG Inspection Mode**: Interactive visualization of query vectorization, top-$K$ FAISS retrieval, similarity scores, and LLM inference time for academic project reviews and viva demonstrations.

---

## 🏗️ 2. Core Architecture & Workflow

```text
                               +-----------------------------+
                               |        React UI             |
                               | (Drag & Drop, Chat, Viewer) |
                               +--------------+--------------+
                                              |
                                              | HTTP REST (Port 8000)
                                              v
                               +-----------------------------+
                               |       FastAPI Backend       |
                               +--------------+--------------+
                                              |
                 +----------------------------+----------------------------+
                 | DOCUMENT INGESTION PIPELINE                             | QUERY PIPELINE
                 v                                                         v
   +---------------------------+                             +---------------------------+
   |  PyMuPDF Text Extraction  |                             |  User Question Received   |
   | (Page-by-page extraction) |                             +-------------+-------------+
   +-------------+-------------+                                           |
                 |                                                         v
                 v                                           +---------------------------+
   +---------------------------+                             | all-MiniLM-L6-v2 Embedder |
   | Text Cleaning & Chunking  |                             | (Dense 384-D Query Vector)|
   | (Size: 500, Overlap: 100) |                             +-------------+-------------+
   +-------------+-------------+                                           |
                 |                                                         v
                 v                                           +---------------------------+
   +---------------------------+                             |    FAISS Semantic Search  |
   | all-MiniLM-L6-v2 Embedder |                             |  (IndexFlatIP Cosine Sim) |
   | (Dense 384-D Vectors)     |                             +-------------+-------------+
   +-------------+-------------+                                           |
                 |                                                         v
                 v                                           +---------------------------+
   +---------------------------+                             |  Relevance Threshold Check|
   |   FAISS Vector Database   |<============================|  (Threshold: 0.35 Score)  |
   |  (index.faiss + metadata) |                             +-------------+-------------+
   +---------------------------+                                           |
                                                                           v
                                                             +---------------------------+
                                                             | Context Prompt Assembly   |
                                                             | (System + Context + Query)|
                                                             +-------------+-------------+
                                                                           |
                                                                           v
                                                             +---------------------------+
                                                             | Ollama Runtime (Gemma 2B) |
                                                             | (Local Grounded Synthesis)|
                                                             +-------------+-------------+
                                                                           |
                                                                           v
                                                             +---------------------------+
                                                             | Grounded Answer + Citations|
                                                             +---------------------------+
```

---

## 🛠️ 3. Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, JavaScript, CSS3, Lucide Icons | Responsive modern user interface |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic | High-performance asynchronous API |
| **PDF Processing** | PyMuPDF (`pymupdf`) | Fast page-by-page text extraction |
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` | Dense 384-dimensional semantic text vectors |
| **Vector Database** | FAISS (`faiss-cpu`) | Inner Product / Cosine similarity vector search |
| **Local LLM Runtime**| Ollama | Local model orchestration |
| **LLM Generator** | `gemma:2b` (Google Gemma 2B) | Grounded natural language generation |

---

## ⚙️ 4. Installation & Setup

### Prerequisites
1. **Python 3.10+** (Tested on Python 3.11)
2. **Node.js v18+** (Tested on Node.js v24)
3. **Ollama**: Download and install from [ollama.com](https://ollama.com)

### Step 1: Pull Local LLM Model
Open a terminal and download Google Gemma 2B:
```powershell
ollama pull gemma:2b
```

Verify the model is installed:
```powershell
ollama list
```

### Step 2: Backend Setup
```powershell
cd backend

# Create & activate virtual environment (or use python.exe directly)
python -m venv venv

# Install backend dependencies
.\venv\Scripts\pip.exe install -r requirements.txt

# Start the FastAPI server
.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```
Backend will start on: **`http://127.0.0.1:8000`** (Interactive Docs: **`http://127.0.0.1:8000/docs`**)

### Step 3: Frontend Setup
In a second terminal:
```powershell
cd frontend

# Install node dependencies
npm.cmd install

# Start Vite dev server
npm.cmd run dev
```
Open your browser at: **`http://localhost:5173`**

---

## 🧪 5. Testing & Verification

Run the automated test suites to verify all subsystems:

```powershell
cd backend

# 1. Test Environment & Ollama Connection
.\venv\Scripts\python.exe test_phase1.py

# 2. Test PDF Extraction & Page Metadata Preservation
.\venv\Scripts\python.exe test_phase2.py

# 3. Test Full End-to-End RAG Pipeline (Upload, Ingest, Search, Gemma Answer, Citations, Out-of-Doc Rejection)
.\venv\Scripts\python.exe test_rag_pipeline.py
```

---

## 📡 6. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns backend, Ollama, and Gemma 2B connectivity status |
| `POST` | `/upload` | Ingests PDF: extracts text, chunks, embeds, and updates FAISS index |
| `POST` | `/ask` | Performs RAG search and returns grounded answer with page citations |
| `GET` | `/documents` | Lists all indexed documents and chunk statistics |

---

## 🎓 7. Viva Demonstration Highlights

1. **Grounded Retrieval**: Ask questions explicitly covered in the PDF to demonstrate verified page citations.
2. **Semantic Flexibility**: Rephrase questions using different words than the document text to demonstrate dense vector similarity search.
3. **Hallucination Prevention**: Ask out-of-document questions (e.g., *"What is the capital of France?"*) to demonstrate the relevance threshold (`0.35`) rejecting the question instead of hallucinating.
4. **RAG Pipeline Inspector**: Click the blue inspector bar in any AI response to show the exact query vector dimensions, top-K chunk rankings, cosine similarity scores, and execution latency.
