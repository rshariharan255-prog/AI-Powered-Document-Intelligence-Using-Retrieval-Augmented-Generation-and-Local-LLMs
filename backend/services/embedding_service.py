import logging
import os
import numpy as np
from typing import List
from config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.dimension = 384  # all-MiniLM-L6-v2 vector dimension
        self.backend = None  # 'onnx' or 'torch'

        # ONNX state
        self._onnx_tokenizer = None
        self._onnx_session = None

        # Torch state
        self._torch_tokenizer = None
        self._torch_model = None
        self._device = "cpu"

    def _load_model(self):
        """Load embedding model (ONNX Runtime primary, PyTorch fallback)."""
        if self.backend is not None:
            return

        # Attempt 1: ONNX Runtime (Bypasses PyTorch WinError 4551 AppLocker restrictions)
        try:
            import onnxruntime as ort
            from tokenizers import Tokenizer
            from huggingface_hub import hf_hub_download

            logger.info(f"Attempting ONNX Runtime load for model {self.model_name}...")

            # Fetch ONNX files (local cache preferred)
            try:
                tok_path = hf_hub_download(repo_id=self.model_name, filename="tokenizer.json", local_files_only=True)
                model_path = hf_hub_download(repo_id=self.model_name, filename="onnx/model.onnx", local_files_only=True)
            except Exception:
                tok_path = hf_hub_download(repo_id=self.model_name, filename="tokenizer.json")
                model_path = hf_hub_download(repo_id=self.model_name, filename="onnx/model.onnx")

            tokenizer = Tokenizer.from_file(tok_path)
            tokenizer.enable_padding()
            tokenizer.enable_truncation(max_length=512)

            opts = ort.SessionOptions()
            opts.log_severity_level = 3
            session = ort.InferenceSession(model_path, sess_options=opts)

            self._onnx_tokenizer = tokenizer
            self._onnx_session = session
            self.backend = "onnx"
            logger.info(f"Embedding model {self.model_name} loaded successfully via ONNX Runtime (dim={self.dimension}).")
            return
        except Exception as e:
            logger.warning(f"ONNX Runtime initialization failed ({e}). Falling back to PyTorch...")

        # Attempt 2: PyTorch + Transformers (Fallback)
        try:
            import torch
            from transformers import AutoTokenizer, AutoModel

            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Loading embedding model: {self.model_name} onto {self._device} via PyTorch...")
            try:
                self._torch_tokenizer = AutoTokenizer.from_pretrained(self.model_name, local_files_only=True)
                self._torch_model = AutoModel.from_pretrained(self.model_name, local_files_only=True)
            except Exception:
                self._torch_tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self._torch_model = AutoModel.from_pretrained(self.model_name)

            self._torch_model.to(self._device)
            self._torch_model.eval()
            self.backend = "torch"
            logger.info(f"Embedding model {self.model_name} loaded successfully via PyTorch (dim={self.dimension}).")
        except Exception as e:
            logger.error(f"Failed to load embedding model via PyTorch: {e}")
            raise e

    def _embed_onnx(self, texts: List[str]) -> np.ndarray:
        encoded = self._onnx_tokenizer.encode_batch(texts)
        input_ids = np.array([e.ids for e in encoded], dtype=np.int64)
        attention_mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)
        token_type_ids = np.array([e.type_ids for e in encoded], dtype=np.int64)

        inputs = {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "token_type_ids": token_type_ids,
        }
        outputs = self._onnx_session.run(None, inputs)
        token_embeddings = outputs[0]

        # Mean pooling
        input_mask_expanded = np.expand_dims(attention_mask, -1).astype(float)
        sum_embeddings = np.sum(token_embeddings * input_mask_expanded, axis=1)
        sum_mask = np.clip(input_mask_expanded.sum(axis=1), 1e-9, None)
        sentence_embeddings = sum_embeddings / sum_mask

        # L2 Normalization
        norms = np.linalg.norm(sentence_embeddings, ord=2, axis=1, keepdims=True)
        norms[norms == 0] = 1e-9
        return (sentence_embeddings / norms).astype(np.float32)

    def _embed_torch(self, texts: List[str]) -> np.ndarray:
        import torch
        import torch.nn.functional as F

        encoded_input = self._torch_tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt"
        ).to(self._device)

        with torch.no_grad():
            model_output = self._torch_model(**encoded_input)

        token_embeddings = model_output[0]
        input_mask_expanded = (
            encoded_input["attention_mask"].unsqueeze(-1).expand(token_embeddings.size()).float()
        )
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        sentence_embeddings = sum_embeddings / sum_mask
        normalized_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)
        return normalized_embeddings.cpu().numpy().astype(np.float32)

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        self._load_model()
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)

        if self.backend == "onnx":
            return self._embed_onnx(texts)
        elif self.backend == "torch":
            return self._embed_torch(texts)
        else:
            raise RuntimeError("No embedding backend is initialized.")

    def embed_documents(self, chunks_text: List[str]) -> np.ndarray:
        return self.embed_texts(chunks_text)

    def embed_query(self, query: str) -> np.ndarray:
        return self.embed_texts([query])


embedding_service = EmbeddingService()
