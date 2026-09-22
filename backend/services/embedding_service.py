import logging
from typing import List, Union
import numpy as np
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel
from config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._tokenizer = None
        self._model = None
        self.dimension = 384  # all-MiniLM-L6-v2 vector dimension

    def _load_model(self):
        """Lazy load the embedding model onto memory/device."""
        if self._tokenizer is None or self._model is None:
            logger.info(f"Loading local embedding model: {self.model_name} onto {self.device}...")
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._model = AutoModel.from_pretrained(self.model_name)
            self._model.to(self.device)
            self._model.eval()
            logger.info(f"Embedding model {self.model_name} loaded successfully (dim={self.dimension}).")

    @staticmethod
    def _mean_pooling(model_output, attention_mask):
        """
        Perform mean pooling over token embeddings taking attention mask into account.
        Standard Sentence-Transformers pooling method.
        """
        token_embeddings = model_output[0]  # First element contains hidden states
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        return sum_embeddings / sum_mask

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        Generate L2-normalized 384-dimensional dense vectors for a list of texts.
        Returns: numpy float32 array of shape (N, 384)
        """
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)

        self._load_model()

        # Handle empty strings gracefully
        cleaned_texts = [t if t.strip() else " " for t in texts]

        # Tokenize sentences with truncation & padding
        encoded_input = self._tokenizer(
            cleaned_texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        ).to(self.device)

        # Compute token embeddings
        with torch.no_grad():
            model_output = self._model(**encoded_input)

        # Perform mean pooling
        sentence_embeddings = self._mean_pooling(model_output, encoded_input['attention_mask'])

        # Normalize embeddings (L2-norm) for cosine similarity via inner product in FAISS
        normalized_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)

        # Convert to numpy float32 array
        embeddings_np = normalized_embeddings.cpu().numpy().astype(np.float32)
        return embeddings_np

    def embed_documents(self, chunks_text: List[str]) -> np.ndarray:
        """Embed document text chunks."""
        return self.embed_texts(chunks_text)

    def embed_query(self, query: str) -> np.ndarray:
        """
        Embed a single user question query.
        Returns: numpy float32 array of shape (1, 384)
        """
        return self.embed_texts([query])

embedding_service = EmbeddingService()
