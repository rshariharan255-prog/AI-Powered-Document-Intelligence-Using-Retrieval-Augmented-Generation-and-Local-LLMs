import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.file_handler import FileHandler
from services.pdf_service import pdf_service
from services.chunking_service import chunking_service
from services.embedding_service import embedding_service
from services.vector_store import vector_store
from models.schemas import UploadPipelineResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Upload"])

@router.post("/upload", response_model=UploadPipelineResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Complete Document Ingestion Pipeline:
    1. Validate file extension, size, and header
    2. Save safely to local uploads directory
    3. Extract text page-by-page (PyMuPDF)
    4. Chunk text with sliding window & overlap (ChunkingService)
    5. Generate dense embeddings (all-MiniLM-L6-v2)
    6. Store normalized vectors and chunk metadata in FAISS
    """
    logger.info(f"Received PDF upload request for file: {file.filename}")
    
    try:
        content = await file.read()
        doc_id, safe_filename, file_path = FileHandler.save_upload_file(file, content)
        
        # Step 1: PDF Text Extraction
        extraction_result = pdf_service.extract_text(
            file_path=file_path,
            document_id=doc_id,
            filename=safe_filename
        )
        
        # Step 2: Chunking
        chunks = chunking_service.chunk_document(
            pages=extraction_result.pages,
            document_id=doc_id
        )
        
        if not chunks:
            raise HTTPException(status_code=400, detail="No valid chunks could be created from document.")

        # Step 3: Embeddings Generation
        chunk_texts = [c.text for c in chunks]
        embeddings = embedding_service.embed_documents(chunk_texts)

        # Step 4: FAISS Storage & Metadata Indexing
        chunks_metadata = [
            {
                "chunk_id": c.chunk_id,
                "document_id": c.document_id,
                "filename": safe_filename,
                "page_number": c.page_number,
                "text": c.text,
                "start_char": c.start_char,
                "end_char": c.end_char
            }
            for c in chunks
        ]
        
        vector_store.add_documents(embeddings, chunks_metadata)
        
        logger.info(
            f"Successfully processed and indexed document '{safe_filename}' "
            f"[{extraction_result.total_pages} pages, {len(chunks)} chunks]."
        )

        return UploadPipelineResponse(
            document_id=doc_id,
            filename=safe_filename,
            pages=extraction_result.total_pages,
            chunks=len(chunks),
            total_characters=extraction_result.total_characters,
            extracted_pages=extraction_result.pages,
            message="Document uploaded, chunked, embedded, and indexed in FAISS successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during PDF upload pipeline: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the PDF file: {str(e)}"
        )
