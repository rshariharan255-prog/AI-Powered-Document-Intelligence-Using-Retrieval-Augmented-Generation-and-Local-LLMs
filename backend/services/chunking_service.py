import logging
from typing import List, Dict, Any
from models.schemas import PageContent
from config import settings

logger = logging.getLogger(__name__)

class DocumentChunk:
    def __init__(self, chunk_id: str, document_id: str, page_number: int, text: str, start_char: int, end_char: int):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.page_number = page_number
        self.text = text
        self.start_char = start_char
        self.end_char = end_char

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "page_number": self.page_number,
            "text": self.text,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "char_count": len(self.text)
        }

class ChunkingService:
    def __init__(self, chunk_size: int = None, chunk_overlap: int = None):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("CHUNK_OVERLAP must be smaller than CHUNK_SIZE.")

    def chunk_page(self, page: PageContent, document_id: str, global_chunk_offset: int) -> List[DocumentChunk]:
        """
        Split a single page's text into overlapping chunks while preserving page metadata.
        Uses sliding window with configurable chunk_size and chunk_overlap.
        """
        text = page.text.strip()
        if not text:
            return []

        chunks: List[DocumentChunk] = []
        step = self.chunk_size - self.chunk_overlap
        
        # If text is shorter than chunk_size, create a single chunk
        if len(text) <= self.chunk_size:
            chunk_id = f"chunk_{global_chunk_offset + 1:04d}"
            chunks.append(
                DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    page_number=page.page_number,
                    text=text,
                    start_char=0,
                    end_char=len(text)
                )
            )
            return chunks

        start = 0
        chunk_idx = 0
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            
            # If not at the very end of the text, try to break at the nearest whitespace or sentence boundary
            if end < len(text):
                # Look backwards for a natural break (newline, period, or space)
                break_point = max(
                    text.rfind('\n', start + int(self.chunk_size * 0.7), end),
                    text.rfind('. ', start + int(self.chunk_size * 0.7), end),
                    text.rfind(' ', start + int(self.chunk_size * 0.7), end)
                )
                if break_point > start:
                    end = break_point + 1 if text[break_point] != '\n' else break_point

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunk_id = f"chunk_{global_chunk_offset + chunk_idx + 1:04d}"
                chunks.append(
                    DocumentChunk(
                        chunk_id=chunk_id,
                        document_id=document_id,
                        page_number=page.page_number,
                        text=chunk_text,
                        start_char=start,
                        end_char=end
                    )
                )
                chunk_idx += 1

            if end >= len(text):
                break
            
            # Slide window forward by step
            start += step

        return chunks

    def chunk_document(self, pages: List[PageContent], document_id: str) -> List[DocumentChunk]:
        """
        Chunk an entire document page-by-page.
        Preserves exact page numbers for each chunk.
        """
        all_chunks: List[DocumentChunk] = []
        for page in pages:
            page_chunks = self.chunk_page(
                page=page,
                document_id=document_id,
                global_chunk_offset=len(all_chunks)
            )
            all_chunks.extend(page_chunks)

        logger.info(
            f"Chunked document {document_id}: {len(pages)} pages -> {len(all_chunks)} chunks "
            f"(chunk_size={self.chunk_size}, overlap={self.chunk_overlap})"
        )
        return all_chunks

chunking_service = ChunkingService()
