import logging
import time
import re
from typing import List, Dict, Any, Optional
from config import settings
from services.embedding_service import embedding_service
from services.vector_store import vector_store
from services.llm_service import llm_service

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a knowledgeable and precise AI Document Assistant.
Your job is to answer the user's question using the provided DOCUMENT CONTEXT.

Guidelines:
1. Thoroughly explain the topics, concepts, titles, and bullet points found in the DOCUMENT CONTEXT.
2. If the user asks what the presentation or document is about, summarize the project title, problem statement, objectives, and methodologies described in the context.
3. Organize your answer clearly using bullet points and concise paragraphs.
4. Base all facts strictly on the text in the DOCUMENT CONTEXT.
"""

OVERVIEW_PATTERNS = [
    "about", "summary", "summarize", "overview", "what is this", "what is the ppt",
    "the ppt is about", "the document is about", "main point", "topic", "purpose",
    "describe", "explain the ppt", "explain the document", "presentation", "freshpulse"
]

class RAGService:
    def __init__(self):
        self.similarity_threshold = settings.SIMILARITY_THRESHOLD
        self.top_k = settings.TOP_K

    def _is_overview_query(self, query: str) -> bool:
        """Check if the user query is asking for a general document summary or overview."""
        q_clean = query.lower().strip()
        if len(q_clean.split()) <= 6 and any(p in q_clean for p in OVERVIEW_PATTERNS):
            return True
        return any(phrase in q_clean for phrase in [
            "the ppt is about", "what is the ppt about", "what is this about",
            "what is this document about", "summarize", "give an overview"
        ])

    def _normalize_question_for_llm(self, question: str) -> str:
        """If user inputs a short fragment like 'THE PPT IS ABOUT', expand it for clear LLM synthesis."""
        q_clean = question.lower().strip()
        if q_clean in ["the ppt is about", "the ppt is about?", "ppt is about", "about", "what is the ppt about", "what is this about"]:
            return "Based on the provided presentation slides, explain what this project and presentation is about, including the title, problem statement, and key objectives."
        elif q_clean in ["summary", "summarize", "overview", "give an overview"]:
            return "Provide a comprehensive summary of the main points, objectives, and methodology in the provided document context."
        return question

    def _build_context_string(self, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Format all retrieved chunks into a clean, structured context block with page/slide indicators.
        """
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            page_num = chunk.get("page", "?")
            text = chunk.get("text", "").strip()
            context_parts.append(f"=== [Slide / Page {page_num}] ===\n{text}")
        return "\n\n".join(context_parts)

    def _build_augmented_prompt(
        self,
        question: str,
        context_text: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Assemble the final structured RAG prompt with separation of concerns.
        """
        prompt_sections = []
        
        # Include limited recent conversation history if provided (e.g. for follow-ups)
        if conversation_history:
            recent_history = conversation_history[-4:]  # Last 2 turns
            history_str = "\n".join([
                f"{'User' if msg.get('role') == 'user' else 'AI'}: {msg.get('content')}"
                for msg in recent_history if msg.get('content')
            ])
            if history_str:
                prompt_sections.append(f"CONVERSATION HISTORY:\n{history_str}\n")

        llm_question = self._normalize_question_for_llm(question)

        prompt_sections.append("DOCUMENT CONTEXT (Extracted from uploaded document):")
        prompt_sections.append(context_text)
        prompt_sections.append(f"\nUSER INQUIRY: {llm_question}")
        prompt_sections.append("\nDETAILED FACTUAL ANSWER:")

        return "\n\n".join(prompt_sections)

    def answer_question(
        self,
        question: str,
        document_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        debug_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Execute the complete RAG Query Pipeline:
        1. Embed user query using all-MiniLM-L6-v2
        2. Perform FAISS Top-K similarity search (and overview chunk inclusion if applicable)
        3. Check relevance against similarity threshold
        4. Construct secure context prompt
        5. Invoke Gemma 2B via Ollama
        6. Return grounded answer, verified source citations, and debug metrics
        """
        start_time = time.time()
        question = question.strip()
        
        if not question:
            return {
                "answer": "Please ask a valid question.",
                "sources": [],
                "is_grounded": False,
                "debug": None
            }

        logger.info(f"Processing question: \"{question}\" (doc_id={document_id})")

        # Step 1: Generate Query Embedding
        query_embedding_start = time.time()
        query_vector = embedding_service.embed_query(question)
        query_embed_time = time.time() - query_embedding_start

        # Step 2: Semantic Similarity Search via FAISS
        search_start = time.time()
        retrieved_chunks = vector_store.search(
            query_embedding=query_vector,
            top_k=self.top_k,
            document_id=document_id
        )
        search_time = time.time() - search_start

        top_score = retrieved_chunks[0]["score"] if retrieved_chunks else 0.0
        is_overview = self._is_overview_query(question)

        # If it's an overview question and a document is loaded, gather the key slides
        if is_overview and document_id:
            intro_chunks = [
                {
                    "chunk_id": m.get("chunk_id"),
                    "document_id": m.get("document_id"),
                    "filename": m.get("filename"),
                    "page": m.get("page_number"),
                    "text": m.get("text"),
                    "score": 0.95
                }
                for m in vector_store.metadata
                if m.get("document_id") == document_id and m.get("page_number") in [1, 2, 3, 4, 5]
            ]
            seen_ids = set()
            merged_chunks = []
            for c in intro_chunks + retrieved_chunks:
                if c["chunk_id"] not in seen_ids:
                    seen_ids.add(c["chunk_id"])
                    merged_chunks.append(c)
            retrieved_chunks = merged_chunks[:self.top_k]
            is_relevant = True
        else:
            is_relevant = len(retrieved_chunks) > 0 and (
                top_score >= self.similarity_threshold or (document_id is not None and top_score >= 0.10)
            )

        logger.info(
            f"Retrieved {len(retrieved_chunks)} chunks (Top score: {top_score:.3f}, "
            f"Overview: {is_overview}). Relevant: {is_relevant}"
        )

        # Prepare debug info
        debug_info = None
        if debug_mode:
            debug_info = {
                "question": question,
                "query_vector_dimension": query_vector.shape[1],
                "retrieved_chunks": [
                    {
                        "chunk_id": c["chunk_id"],
                        "page": c["page"],
                        "score": round(c["score"], 4),
                        "snippet": c["text"][:140] + "..." if len(c["text"]) > 140 else c["text"]
                    }
                    for c in retrieved_chunks
                ],
                "top_score": round(top_score, 4),
                "threshold": self.similarity_threshold,
                "is_above_threshold": is_relevant,
                "timing_ms": {
                    "embedding": round(query_embed_time * 1000, 2),
                    "search": round(search_time * 1000, 2)
                }
            }

        # Out-of-Document Rejection
        if not is_relevant:
            out_of_doc_response = (
                "I couldn't find enough relevant information in the uploaded document to answer this question."
            )
            return {
                "answer": out_of_doc_response,
                "sources": [],
                "is_grounded": False,
                "debug": debug_info
            }

        # Step 4: Build Filtered Context & Format Prompt
        filtered_chunks = retrieved_chunks[:self.top_k]
        context_string = self._build_context_string(filtered_chunks)
        augmented_prompt = self._build_augmented_prompt(
            question=question,
            context_text=context_string,
            conversation_history=conversation_history
        )

        # Step 5: Generate Answer via Ollama (Gemma 2B)
        llm_start = time.time()
        llm_result = llm_service.generate_response(
            prompt=augmented_prompt,
            system_prompt=SYSTEM_PROMPT
        )
        llm_time = time.time() - llm_start

        if not llm_result["success"]:
            return {
                "answer": f"Error communicating with local AI model: {llm_result.get('error')}",
                "sources": [],
                "is_grounded": False,
                "debug": debug_info
            }

        answer_text = llm_result["response"]

        # Step 6: Format Source Citations
        sources = [
            {
                "document": chunk.get("filename", "document"),
                "page": chunk.get("page"),
                "score": round(chunk.get("score"), 3),
                "excerpt": chunk.get("text")[:200] + ("..." if len(chunk.get("text")) > 200 else "")
            }
            for chunk in filtered_chunks
        ]

        total_time = time.time() - start_time
        logger.info(f"Answer generated in {total_time:.2f}s ({len(sources)} source citations)")

        if debug_mode and debug_info:
            debug_info["augmented_prompt"] = augmented_prompt
            debug_info["timing_ms"]["llm_generation"] = round(llm_time * 1000, 2)
            debug_info["timing_ms"]["total"] = round(total_time * 1000, 2)
            debug_info["tokens_generated"] = llm_result.get("eval_count", 0)

        return {
            "answer": answer_text,
            "sources": sources,
            "is_grounded": True,
            "debug": debug_info
        }

rag_service = RAGService()
