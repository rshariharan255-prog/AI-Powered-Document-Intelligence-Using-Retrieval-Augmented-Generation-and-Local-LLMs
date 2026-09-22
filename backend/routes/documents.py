import logging
from typing import List
from fastapi import APIRouter
from models.schemas import DocumentListItem
from services.vector_store import vector_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Documents"])

@router.get("/documents", response_model=List[DocumentListItem])
def list_documents():
    """
    List all documents currently indexed in the local FAISS vector store.
    """
    return vector_store.get_indexed_documents()
