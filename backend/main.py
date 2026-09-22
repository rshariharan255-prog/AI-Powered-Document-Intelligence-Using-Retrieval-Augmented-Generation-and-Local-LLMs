import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import settings
from services.llm_service import llm_service
from routes.upload import router as upload_router
from routes.query import router as query_router
from routes.documents import router as documents_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Local AI Document Q&A (RAG)",
    description="Backend API for Local RAG Document Assistant using FastAPI, PyMuPDF, SentenceTransformers, FAISS, and Ollama (Gemma 2B)",
    version="1.0.0"
)

# Include Routers
app.include_router(upload_router)
app.include_router(query_router)
app.include_router(documents_router)

# Enable CORS for React Vite Frontend (http://localhost:5173 by default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TestPromptRequest(BaseModel):
    prompt: str = "Explain in one sentence what Retrieval-Augmented Generation is."

@app.get("/")
def root():
    return {
        "title": "Local RAG Document Assistant API",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """
    Check system health including backend, Ollama server, and Gemma 2B model availability.
    """
    ollama_status = llm_service.check_connection()
    return {
        "status": "ok",
        "backend": True,
        "ollama": ollama_status["connected"],
        "model_available": ollama_status["model_available"],
        "target_model": settings.OLLAMA_MODEL,
        "ollama_details": ollama_status
    }

@app.post("/api/test-llm")
def test_llm(request: TestPromptRequest):
    """
    Test endpoint for Phase 1 to verify local LLM generation.
    """
    logger.info(f"Testing LLM generation with model: {settings.OLLAMA_MODEL}")
    result = llm_service.generate_response(
        prompt=request.prompt,
        system_prompt="You are a helpful and concise technical AI assistant."
    )
    if not result["success"]:
        raise HTTPException(status_code=503, detail=result["error"])
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
