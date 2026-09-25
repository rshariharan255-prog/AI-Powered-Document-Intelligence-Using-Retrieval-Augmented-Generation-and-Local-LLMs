# 🔍 Deep Dive: How the Code Works

This document provides a detailed look at the core files in the `backend/services/` directory and explains exactly how they work together to power the AI Document Assistant.

---

## 1. `chunking_service.py` ✂️
**Purpose:** Breaks large documents down into smaller, readable pieces.

**How it works:**
- It defines a `ChunkingService` class that uses a "sliding window" approach.
- It takes two main settings from `config.py`: `CHUNK_SIZE` (default 500 characters) and `CHUNK_OVERLAP` (default 100 characters).
- When `chunk_page()` is called, it reads the text of a single page. If the text is longer than the chunk size, it slices it into 500-character blocks.
- To prevent cutting a sentence in half, it looks backwards from the end of the 500 characters to find a natural break (like a period `.`, a newline `\n`, or a space).
- The next chunk starts 400 characters in (because of the 100 character overlap), ensuring that context isn't lost between boundaries.
- Every chunk is assigned a unique `chunk_id` and keeps track of its `document_id` and `page_number`.

## 2. `embedding_service.py` 🧠
**Purpose:** Converts human-readable text into numerical vectors (AI's language).

**How it works:**
- It uses the `sentence-transformers/all-MiniLM-L6-v2` model from Hugging Face via the PyTorch `transformers` library.
- This model was chosen because it creates small but highly accurate 384-dimensional vectors and runs very fast on local CPUs.
- When `embed_texts()` is called, it first tokenizes the text (turning words into IDs).
- It then passes the tokens through the neural network model.
- It uses a technique called `_mean_pooling()` which averages the meaning of all the words in the sentence, paying attention to the `attention_mask` (ignoring padding).
- Finally, it normalizes the vectors (`L2-norm`) so they can be compared using Cosine Similarity in the vector database.

## 3. `vector_store.py` 🗄️
**Purpose:** Stores and searches the vector embeddings efficiently.

**How it works:**
- It acts as a wrapper around **FAISS** (Facebook AI Similarity Search), a library optimized for searching through millions of vectors instantly.
- It initializes an `IndexFlatIP` (Inner Product index). Because our embeddings from the previous step are L2-normalized, the inner product is mathematically identical to Cosine Similarity.
- When `add_documents()` is called, the 384-dimensional arrays are added to the FAISS index, and the exact corresponding text and metadata (page number, chunk ID) are saved in a standard JSON file (`metadata/chunks.json`).
- When `search()` is called with a user's question vector, FAISS instantly returns the indices of the top most similar vectors (e.g., `TOP_K=6`). The service then maps these indices back to the JSON metadata to return the actual readable text chunks.

## 4. `llm_service.py` 🤖
**Purpose:** Talks to the local Ollama instance (running `llama3.2:1b`) to generate natural language answers.

**How it works:**
- It connects to `http://localhost:11434` (Ollama's default port).
- `generate_response()` builds a JSON payload containing the heavily structured prompt (which includes the user's question + the chunks retrieved from FAISS).
- **Optimizations:** It sends specific settings to make generation faster on local machines:
  - `num_ctx: 1024`: Limits how much memory the model uses for the prompt.
  - `num_predict: 160`: Forces the model to stop generating after 160 tokens, preventing it from rambling and wasting time.
  - `temperature: 0.1`: Keeps the AI highly deterministic and factual (less "creative" hallucination).
  - `keep_alive: "60m"`: Tells Ollama to keep the model loaded in RAM for an hour so subsequent questions are answered instantly without reloading the 1GB model.
- It sends this payload to `/api/generate` and returns the generated text back to the frontend.

## 5. `rag_service.py` 🎯
**Purpose:** The central orchestrator that ties all the above services together.

**How it works:**
1. Takes the user's raw question.
2. Uses `_detect_query_intent()` to analyze keywords. (If you ask "Who is the team?", it automatically forces the system to look at Slide 1 or 2, bypassing purely semantic search to ensure accuracy).
3. Calls `embedding_service.embed_query()` on the question.
4. Calls `vector_store.search()` using the new vector.
5. Takes the returned text chunks and formats them into a strict string using `_build_augmented_prompt()`. (e.g., `"=== [Slide 4] ===\n<Text>"`)
6. Sends the final giant prompt to `llm_service.generate_response()`.
7. Bundles the final answer with the exact source excerpts used (so the frontend can display the citations) and returns it.

---

> [!NOTE]
> **Data Flow Summary**
> Text goes in → Split by `chunking_service` → Numbered by `embedding_service` → Saved in `vector_store`.
> Question goes in → Numbered by `embedding_service` → Matched in `vector_store` → Orchestrated by `rag_service` → Answered by `llm_service`.
