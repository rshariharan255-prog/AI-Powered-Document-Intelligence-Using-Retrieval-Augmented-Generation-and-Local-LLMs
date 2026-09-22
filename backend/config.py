import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory for the backend
BASE_DIR = Path(__file__).resolve().parent

# Load .env file
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

class Settings:
    # Ollama Configuration
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma:2b")
    
    # Embedding Configuration
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Chunking Configuration
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "100"))
    
    # Retrieval Configuration
    TOP_K: int = int(os.getenv("TOP_K", "6"))
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.20"))
    
    # Storage Paths
    UPLOAD_DIR: Path = BASE_DIR / os.getenv("UPLOAD_DIR", "data/uploads")
    FAISS_DIR: Path = BASE_DIR / os.getenv("FAISS_DIR", "data/faiss")
    METADATA_DIR: Path = BASE_DIR / os.getenv("METADATA_DIR", "data/metadata")

    @classmethod
    def ensure_directories(cls):
        cls.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        cls.FAISS_DIR.mkdir(parents=True, exist_ok=True)
        cls.METADATA_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
