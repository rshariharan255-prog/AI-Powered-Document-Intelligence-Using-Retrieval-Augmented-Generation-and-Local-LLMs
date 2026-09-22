import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import faiss
from config import settings

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.index_path = settings.FAISS_DIR / "index.faiss"
        self.metadata_path = settings.METADATA_DIR / "chunks.json"
        
        self.index: faiss.IndexFlatIP = None
        self.metadata: List[Dict[str, Any]] = []
        
        self._initialize_or_load()

    def _initialize_or_load(self):
        """Load existing FAISS index and metadata from disk if present, else create new."""
        settings.ensure_directories()
        
        if self.index_path.exists() and self.metadata_path.exists():
            try:
                logger.info(f"Loading existing FAISS index from {self.index_path}...")
                self.index = faiss.read_index(str(self.index_path))
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors and {len(self.metadata)} metadata records.")
                return
            except Exception as e:
                logger.error(f"Failed to load existing index/metadata: {e}. Re-initializing new index.")

        # Create new IndexFlatIP (Cosine similarity for L2-normalized vectors)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = []
        logger.info(f"Initialized new empty FAISS IndexFlatIP (dim={self.dimension}).")

    def save(self):
        """Persist FAISS index and metadata to disk."""
        try:
            settings.ensure_directories()
            faiss.write_index(self.index, str(self.index_path))
            with open(self.metadata_path, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved FAISS index ({self.index.ntotal} vectors) and metadata to disk.")
        except Exception as e:
            logger.error(f"Failed to save FAISS index/metadata: {e}")
            raise

    def add_documents(self, embeddings: np.ndarray, chunks_metadata: List[Dict[str, Any]]) -> int:
        """
        Add L2-normalized embeddings and their corresponding metadata to FAISS.
        Returns the number of vectors added.
        """
        if len(embeddings) == 0:
            return 0

        if embeddings.shape[1] != self.dimension:
            raise ValueError(f"Embedding dimension {embeddings.shape[1]} does not match index dimension {self.dimension}")

        if len(embeddings) != len(chunks_metadata):
            raise ValueError(f"Mismatch between number of vectors ({len(embeddings)}) and metadata ({len(chunks_metadata)})")

        # Ensure float32 format
        vectors = np.ascontiguousarray(embeddings, dtype=np.float32)

        # Add vectors to FAISS index
        self.index.add(vectors)
        
        # Append metadata in exact corresponding order
        self.metadata.extend(chunks_metadata)

        # Persist to disk
        self.save()

        logger.info(f"Successfully indexed {len(chunks_metadata)} chunks. Total vectors in FAISS: {self.index.ntotal}")
        return len(chunks_metadata)

    def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = None,
        document_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for top-K most similar chunks for a given query vector.
        Optionally filters results by document_id.
        Returns list of matched chunks with cosine similarity score.
        """
        top_k = top_k or settings.TOP_K
        if self.index.ntotal == 0:
            logger.warning("Search called on empty FAISS index.")
            return []

        # Ensure float32 format and shape (1, 384)
        query_vec = np.ascontiguousarray(query_embedding, dtype=np.float32)
        if len(query_vec.shape) == 1:
            query_vec = query_vec.reshape(1, -1)

        # If document_id filter is specified, fetch more candidates to ensure top_k matching
        fetch_k = min(self.index.ntotal, max(top_k * 4, 20)) if document_id else min(self.index.ntotal, top_k)

        # FAISS search
        scores, indices = self.index.search(query_vec, fetch_k)

        results: List[Dict[str, Any]] = []
        raw_scores = scores[0]
        raw_indices = indices[0]

        for score, idx in zip(raw_scores, raw_indices):
            if idx < 0 or idx >= len(self.metadata):
                continue
            
            chunk_meta = self.metadata[idx]
            
            # Apply document filter if requested
            if document_id and chunk_meta.get("document_id") != document_id:
                continue

            result_item = {
                "chunk_id": chunk_meta.get("chunk_id"),
                "document_id": chunk_meta.get("document_id"),
                "filename": chunk_meta.get("filename"),
                "page": chunk_meta.get("page_number"),
                "text": chunk_meta.get("text"),
                "score": float(score)  # Cosine similarity score [-1.0, 1.0]
            }
            results.append(result_item)

            if len(results) >= top_k:
                break

        return results

    def get_indexed_documents(self) -> List[Dict[str, Any]]:
        """Return list of distinct documents currently indexed in FAISS."""
        docs: Dict[str, Dict[str, Any]] = {}
        for m in self.metadata:
            doc_id = m.get("document_id")
            if doc_id not in docs:
                docs[doc_id] = {
                    "document_id": doc_id,
                    "filename": m.get("filename", "unknown.pdf"),
                    "chunks": 0,
                    "pages": set()
                }
            docs[doc_id]["chunks"] += 1
            docs[doc_id]["pages"].add(m.get("page_number"))

        return [
            {
                "document_id": d["document_id"],
                "filename": d["filename"],
                "total_chunks": d["chunks"],
                "total_pages": len(d["pages"])
            }
            for d in docs.values()
        ]

vector_store = VectorStore()
