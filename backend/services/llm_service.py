import logging
import requests
from typing import Dict, Any, Optional
from config import settings

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    def check_connection(self) -> Dict[str, Any]:
        """
        Check if Ollama server is reachable and if the target model is available.
        """
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                model_exists = any(self.model in m or m.startswith(self.model) for m in models)
                return {
                    "connected": True,
                    "model_available": model_exists,
                    "installed_models": models,
                    "target_model": self.model,
                    "message": "Ollama is running" if model_exists else f"Model '{self.model}' not found in Ollama"
                }
            return {
                "connected": False,
                "model_available": False,
                "installed_models": [],
                "target_model": self.model,
                "message": f"Ollama returned HTTP status {response.status_code}"
            }
        except requests.exceptions.ConnectionError:
            return {
                "connected": False,
                "model_available": False,
                "installed_models": [],
                "target_model": self.model,
                "message": "Ollama is not available. Please start Ollama and try again."
            }
        except Exception as e:
            return {
                "connected": False,
                "model_available": False,
                "installed_models": [],
                "target_model": self.model,
                "message": f"Error connecting to Ollama: {str(e)}"
            }

    def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate text response from the configured local model via Ollama.
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,  # Low temperature for grounded and consistent RAG responses
                "top_p": 0.9
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=180
            )
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "response": result.get("response", "").strip(),
                    "total_duration": result.get("total_duration"),
                    "eval_count": result.get("eval_count")
                }
            else:
                return {
                    "success": False,
                    "response": None,
                    "error": f"Ollama error: HTTP {response.status_code} - {response.text}"
                }
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "response": None,
                "error": "Local AI service is unavailable. Please make sure Ollama is running."
            }
        except Exception as e:
            return {
                "success": False,
                "response": None,
                "error": f"Failed to generate response: {str(e)}"
            }

llm_service = LLMService()
