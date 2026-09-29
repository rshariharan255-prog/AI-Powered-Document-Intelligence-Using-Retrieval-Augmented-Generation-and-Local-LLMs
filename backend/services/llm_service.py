import logging
import requests
from typing import Dict, Any, Optional
from config import settings

logger = logging.getLogger(__name__)


class LLMService:
    @property
    def provider(self) -> str:
        return settings.LLM_PROVIDER.lower()

    @property
    def nvidia_model(self) -> str:
        return settings.NVIDIA_MODEL

    @property
    def nvidia_api_key(self) -> str:
        return settings.NVIDIA_API_KEY

    @property
    def nvidia_base_url(self) -> str:
        return settings.NVIDIA_BASE_URL.rstrip("/")

    @property
    def gemini_model(self) -> str:
        return settings.GEMINI_MODEL

    @property
    def gemini_api_key(self) -> str:
        return settings.GEMINI_API_KEY

    @property
    def ollama_model(self) -> str:
        return settings.OLLAMA_MODEL

    @property
    def ollama_base_url(self) -> str:
        return settings.OLLAMA_BASE_URL.rstrip("/")

    def check_connection(self) -> Dict[str, Any]:
        """
        Check if the configured LLM provider is reachable.
        """
        if self.provider == "nvidia":
            return self._check_nvidia_connection()
        elif self.provider == "gemini":
            return self._check_gemini_connection()
        else:
            return self._check_ollama_connection()

    def _check_nvidia_connection(self) -> Dict[str, Any]:
        """Check NVIDIA API connectivity with a small test request."""
        try:
            headers = {
                "Authorization": f"Bearer {self.nvidia_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.nvidia_model,
                "messages": [{"role": "user", "content": "Hi"}],
                "max_tokens": 5
            }
            response = requests.post(
                f"{self.nvidia_base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            if response.status_code == 200:
                return {
                    "connected": True,
                    "model_available": True,
                    "installed_models": [self.nvidia_model],
                    "target_model": self.nvidia_model,
                    "message": f"NVIDIA API is connected (model: {self.nvidia_model})"
                }
            else:
                return {
                    "connected": False,
                    "model_available": False,
                    "installed_models": [],
                    "target_model": self.nvidia_model,
                    "message": f"NVIDIA API error: HTTP {response.status_code} - {response.text}"
                }
        except Exception as e:
            return {
                "connected": False,
                "model_available": False,
                "installed_models": [],
                "target_model": self.nvidia_model,
                "message": f"NVIDIA API error: {str(e)}"
            }

    def _check_gemini_connection(self) -> Dict[str, Any]:
        """Check Google Gemini API connectivity."""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
            payload = {
                "contents": [{"parts": [{"text": "Hi"}]}],
                "generationConfig": {"maxOutputTokens": 5}
            }
            response = requests.post(url, json=payload, timeout=15)
            if response.status_code == 200:
                return {
                    "connected": True,
                    "model_available": True,
                    "installed_models": [self.gemini_model],
                    "target_model": self.gemini_model,
                    "message": f"Gemini API is connected (model: {self.gemini_model})"
                }
            else:
                return {
                    "connected": False,
                    "model_available": False,
                    "installed_models": [],
                    "target_model": self.gemini_model,
                    "message": f"Gemini API error: HTTP {response.status_code} - {response.text}"
                }
        except Exception as e:
            return {
                "connected": False,
                "model_available": False,
                "installed_models": [],
                "target_model": self.gemini_model,
                "message": f"Gemini API error: {str(e)}"
            }

    def _check_ollama_connection(self) -> Dict[str, Any]:
        """Check if Ollama server is reachable and if the target model is available."""
        try:
            response = requests.get(f"{self.ollama_base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                model_exists = any(self.ollama_model in m or m.startswith(self.ollama_model) for m in models)
                return {
                    "connected": True,
                    "model_available": model_exists,
                    "installed_models": models,
                    "target_model": self.ollama_model,
                    "message": "Ollama is running" if model_exists else f"Model '{self.ollama_model}' not found in Ollama"
                }
            return {
                "connected": False,
                "model_available": False,
                "installed_models": [],
                "target_model": self.ollama_model,
                "message": f"Ollama returned HTTP status {response.status_code}"
            }
        except requests.exceptions.ConnectionError:
            return {
                "connected": False,
                "model_available": False,
                "installed_models": [],
                "target_model": self.ollama_model,
                "message": "Ollama is not available. Please start Ollama and try again."
            }
        except Exception as e:
            return {
                "connected": False,
                "model_available": False,
                "installed_models": [],
                "target_model": self.ollama_model,
                "message": f"Error connecting to Ollama: {str(e)}"
            }

    def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate text response from the configured LLM provider.
        """
        if self.provider == "nvidia":
            return self._generate_nvidia(prompt, system_prompt)
        elif self.provider == "gemini":
            return self._generate_gemini(prompt, system_prompt)
        else:
            return self._generate_ollama(prompt, system_prompt)

    def _generate_nvidia(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate response using NVIDIA NIM API."""
        headers = {
            "Authorization": f"Bearer {self.nvidia_api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.nvidia_model,
            "messages": messages,
            "temperature": 0.1,
            "top_p": 0.9,
            "max_tokens": 1024,
            "stream": False
        }

        try:
            logger.info(f"Sending request to NVIDIA API (model: {self.nvidia_model})")
            response = requests.post(
                f"{self.nvidia_base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=180
            )

            if response.status_code == 200:
                result = response.json()
                answer = result["choices"][0]["message"]["content"].strip()
                usage = result.get("usage", {})
                return {
                    "success": True,
                    "response": answer,
                    "total_duration": None,
                    "eval_count": usage.get("completion_tokens", 0)
                }
            else:
                error_text = response.text
                logger.error(f"NVIDIA API HTTP {response.status_code}: {error_text}")
                return {
                    "success": False,
                    "response": None,
                    "error": f"NVIDIA API error: HTTP {response.status_code} - {error_text}"
                }
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "response": None,
                "error": "Cannot reach NVIDIA API. Please check your internet connection."
            }
        except Exception as e:
            logger.error(f"NVIDIA API error: {str(e)}", exc_info=True)
            return {
                "success": False,
                "response": None,
                "error": f"NVIDIA API error: {str(e)}"
            }

    def _generate_gemini(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate response using Google Gemini API with automatic fallback models for 503/load spikes.
        """
        candidate_models = [
            self.gemini_model,
            "gemini-flash-latest",
            "gemma-4-26b-a4b-it",
            "gemini-pro-latest"
        ]

        full_text = prompt
        if system_prompt:
            full_text = f"{system_prompt}\n\n{prompt}"

        payload = {
            "contents": [{"parts": [{"text": full_text}]}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1024
            }
        }

        last_error = None
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.gemini_api_key}"
            try:
                logger.info(f"Sending request to Gemini API (model: {model})")
                response = requests.post(url, json=payload, timeout=30)
                if response.status_code == 200:
                    result = response.json()
                    candidates = result.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        answer = "".join(p.get("text", "") for p in parts).strip()
                        return {
                            "success": True,
                            "response": answer,
                            "total_duration": None,
                            "eval_count": 0
                        }
                elif response.status_code == 503:
                    logger.warning(f"Gemini model '{model}' returned HTTP 503 (high demand). Trying fallback model...")
                    last_error = f"Gemini API error: HTTP 503 (high demand)"
                    continue
                else:
                    error_text = response.text
                    logger.error(f"Gemini API HTTP {response.status_code}: {error_text}")
                    last_error = f"Gemini API error: HTTP {response.status_code} - {error_text}"
            except Exception as e:
                logger.error(f"Gemini API error with model {model}: {str(e)}", exc_info=True)
                last_error = f"Gemini API error: {str(e)}"

        return {
            "success": False,
            "response": None,
            "error": last_error or "Gemini API failed on all fallback models."
        }

    def _generate_ollama(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate text response from the configured local model via Ollama."""
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": "60m",  # Keep model warm in RAM to avoid reload latency
            "options": {
                "temperature": 0.1,  # Low temperature for grounded and consistent RAG responses
                "top_p": 0.9,
                "num_predict": 160,  # Cap generation tokens for faster responses
                "num_ctx": 1024,     # Limit context window for 4x faster CPU prompt evaluation
                "num_thread": 6      # Multi-core CPU utilization
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = requests.post(
                f"{self.ollama_base_url}/api/generate",
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
