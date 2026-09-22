from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PageContent(BaseModel):
    page_number: int = Field(..., description="1-indexed page number from the original PDF")
    text: str = Field(..., description="Extracted and cleaned textual content of the page")
    char_count: int = Field(..., description="Number of characters on this page")

class PDFExtractionResult(BaseModel):
    document_id: str
    filename: str
    total_pages: int
    total_characters: int
    pages: List[PageContent]
    message: str = "PDF text extracted successfully"

class UploadPipelineResponse(BaseModel):
    document_id: str
    filename: str
    pages: int
    chunks: int
    total_characters: int
    extracted_pages: Optional[List[PageContent]] = None
    message: str = "Document processed, chunked, embedded, and indexed in FAISS successfully"

class MessageItem(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str

class AskRequest(BaseModel):
    document_id: Optional[str] = None
    question: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    debug_mode: Optional[bool] = False

class SourceCitation(BaseModel):
    document: str
    page: int
    score: float
    excerpt: str

class AskResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    is_grounded: bool
    debug: Optional[Dict[str, Any]] = None

class DocumentListItem(BaseModel):
    document_id: str
    filename: str
    total_chunks: int
    total_pages: int
