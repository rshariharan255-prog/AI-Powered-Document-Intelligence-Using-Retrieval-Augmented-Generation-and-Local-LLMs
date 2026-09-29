import logging
from fastapi import APIRouter, HTTPException
from models.schemas import AskRequest, AskResponse
from services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Query"])

@router.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest):
    """
    RAG Question Answering Endpoint:
    1. Embeds question using local embedding model
    2. Searches FAISS for top-K matching chunks
    3. Evaluates relevance against similarity threshold
    4. Builds context prompt and queries local Gemma 2B via Ollama
    5. Returns grounded answer with verified source pages and similarity scores
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        result = rag_service.answer_question(
            question=request.question,
            document_id=request.document_id,
            conversation_history=request.conversation_history,
            debug_mode=request.debug_mode
        )
        return AskResponse(**result)
    except Exception as e:
        logger.error(f"Error executing RAG pipeline for question: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error executing RAG query: {str(e)}"
        )
    '''Step 1: "What is machine learning?"
             ↓
    Step 2: Convert question into numbers (vector embedding)
             ↓
    Step 3: Search FAISS database → find PDF chunks that match
             ↓
    Step 4: Filter out weak matches (below similarity threshold)
             ↓
    Step 5: Take the best matching chunks + question
             → Send to Gemma 2B AI model (via Ollama)
             → AI reads the chunks and writes an answer
             ↓
    Step 6: Return the answer + which pages it came from

    '''