"""
Multi-provider LLM abstraction layer for Circuit Flow AI.
Supports: OpenAI, Anthropic (Claude), Google Gemini, Ollama (local), 
          Groq, Mistral, DeepSeek, XAI (Grok).
No subscription system — user provides their own API keys.
"""
import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List
from backend.app.config import settings

# --- Available Models Catalog (like Antigravity's model chooser) ---
AVAILABLE_MODELS: List[Dict[str, Any]] = [
    # Google Gemini
    {
        "id": "gemini-2.0-flash-exp",
        "name": "Gemini 2.0 Flash",
        "provider": "gemini",
        "description": "Google's fastest multimodal model. Great for real-time circuit analysis.",
        "context_window": 1_000_000,
        "supports_vision": True,
        "tier": "free",
        "icon": "google",
    },
    {
        "id": "gemini-1.5-pro",
        "name": "Gemini 1.5 Pro",
        "provider": "gemini",
        "description": "Best-in-class reasoning for complex PCB design tasks.",
        "context_window": 2_000_000,
        "supports_vision": True,
        "tier": "pro",
        "icon": "google",
    },
    {
        "id": "gemini-1.5-flash",
        "name": "Gemini 1.5 Flash",
        "provider": "gemini",
        "description": "Fast and efficient. Good for quick circuit queries.",
        "context_window": 1_000_000,
        "supports_vision": True,
        "tier": "free",
        "icon": "google",
    },
    # OpenAI
    {
        "id": "gpt-4o",
        "name": "GPT-4o",
        "provider": "openai",
        "description": "OpenAI's most capable multimodal model. Excellent circuit understanding.",
        "context_window": 128_000,
        "supports_vision": True,
        "tier": "pro",
        "icon": "openai",
    },
    {
        "id": "gpt-4o-mini",
        "name": "GPT-4o Mini",
        "provider": "openai",
        "description": "Fast and affordable OpenAI model for circuit parsing.",
        "context_window": 128_000,
        "supports_vision": True,
        "tier": "free",
        "icon": "openai",
    },
    {
        "id": "o1-mini",
        "name": "o1 Mini",
        "provider": "openai",
        "description": "OpenAI reasoning model optimized for STEM tasks.",
        "context_window": 128_000,
        "supports_vision": False,
        "tier": "pro",
        "icon": "openai",
    },
    # Anthropic Claude
    {
        "id": "claude-sonnet-4-5",
        "name": "Claude Sonnet 4.5",
        "provider": "anthropic",
        "description": "Best Claude model for complex engineering and code generation.",
        "context_window": 200_000,
        "supports_vision": True,
        "tier": "pro",
        "icon": "anthropic",
    },
    {
        "id": "claude-3-5-haiku-20241022",
        "name": "Claude 3.5 Haiku",
        "provider": "anthropic",
        "description": "Fast Claude model. Great for real-time circuit chat.",
        "context_window": 200_000,
        "supports_vision": True,
        "tier": "free",
        "icon": "anthropic",
    },
    # Groq (ultra-fast inference)
    {
        "id": "llama-3.3-70b-versatile",
        "name": "Llama 3.3 70B (Groq)",
        "provider": "groq",
        "description": "Ultra-fast open-source model via Groq. Free tier available.",
        "context_window": 128_000,
        "supports_vision": False,
        "tier": "free",
        "icon": "groq",
    },
    {
        "id": "mixtral-8x7b-32768",
        "name": "Mixtral 8x7B (Groq)",
        "provider": "groq",
        "description": "High-quality MoE model for circuit text tasks.",
        "context_window": 32_768,
        "supports_vision": False,
        "tier": "free",
        "icon": "groq",
    },
    # DeepSeek
    {
        "id": "deepseek-chat",
        "name": "DeepSeek V3",
        "provider": "deepseek",
        "description": "Excellent at code and electronics reasoning at low cost.",
        "context_window": 64_000,
        "supports_vision": False,
        "tier": "free",
        "icon": "deepseek",
    },
    # Mistral
    {
        "id": "mistral-large-latest",
        "name": "Mistral Large",
        "provider": "mistral",
        "description": "High-capability European model with strong code understanding.",
        "context_window": 128_000,
        "supports_vision": False,
        "tier": "pro",
        "icon": "mistral",
    },
    # XAI Grok
    {
        "id": "grok-2-latest",
        "name": "Grok 2",
        "provider": "xai",
        "description": "xAI's reasoning model. Good for circuit logic.",
        "context_window": 131_072,
        "supports_vision": True,
        "tier": "pro",
        "icon": "xai",
    },
    # Ollama Local
    {
        "id": "ollama/llama3.2",
        "name": "Llama 3.2 (Local)",
        "provider": "ollama",
        "description": "Run fully offline on your own machine. No API key needed.",
        "context_window": 128_000,
        "supports_vision": False,
        "tier": "local",
        "icon": "ollama",
    },
    {
        "id": "ollama/qwen2.5-coder:7b",
        "name": "Qwen 2.5 Coder 7B (Local)",
        "provider": "ollama",
        "description": "Specialized code/electronics model. Runs fully offline.",
        "context_window": 128_000,
        "supports_vision": False,
        "tier": "local",
        "icon": "ollama",
    },
    {
        "id": "ollama/mistral",
        "name": "Mistral 7B (Local)",
        "provider": "ollama",
        "description": "Fast open-source model for local offline use.",
        "context_window": 32_768,
        "supports_vision": False,
        "tier": "local",
        "icon": "ollama",
    },
]


class LLMProvider:
    """
    Unified multi-provider LLM abstraction.
    Priority: selected_model -> env key auto-detect -> rule_based fallback.
    No subscription. User brings their own API key.
    """

    def __init__(self):
        self.selected_model_id: str = "gemini-2.0-flash-exp"
        self._api_keys: Dict[str, str] = {}
        self._load_from_env()

    def _load_from_env(self):
        """Load API keys from environment variables."""
        self._api_keys = {
            "gemini": os.getenv("GEMINI_API_KEY", settings.gemini_api_key),
            "openai": os.getenv("OPENAI_API_KEY", settings.openai_api_key),
            "anthropic": os.getenv("ANTHROPIC_API_KEY", settings.anthropic_api_key),
            "groq": os.getenv("GROQ_API_KEY", ""),
            "deepseek": os.getenv("DEEPSEEK_API_KEY", ""),
            "mistral": os.getenv("MISTRAL_API_KEY", ""),
            "xai": os.getenv("XAI_API_KEY", ""),
            "ollama": "local",  # No key needed for local Ollama
        }
        # Auto-select a model if a key is available
        for provider in ["gemini", "openai", "anthropic", "groq", "deepseek", "mistral", "xai"]:
            if self._api_keys.get(provider):
                defaults = {
                    "gemini": "gemini-2.0-flash-exp",
                    "openai": "gpt-4o-mini",
                    "anthropic": "claude-3-5-haiku-20241022",
                    "groq": "llama-3.3-70b-versatile",
                    "deepseek": "deepseek-chat",
                    "mistral": "mistral-large-latest",
                    "xai": "grok-2-latest",
                }
                self.selected_model_id = defaults[provider]
                break

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Return all available models with their key status."""
        result = []
        for model in AVAILABLE_MODELS:
            m = dict(model)
            provider = m["provider"]
            if provider == "ollama":
                m["key_configured"] = True  # always "available" (may not be running)
            else:
                m["key_configured"] = bool(self._api_keys.get(provider, ""))
            m["active"] = (m["id"] == self.selected_model_id)
            result.append(m)
        return result

    def set_api_key(self, provider: str, key: str):
        """Set/update API key for a provider."""
        self._api_keys[provider] = key
        # Update settings in-memory
        if provider == "gemini":
            settings.gemini_api_key = key
        elif provider == "openai":
            settings.openai_api_key = key
        elif provider == "anthropic":
            settings.anthropic_api_key = key

    def set_model(self, model_id: str) -> bool:
        """Select the active model."""
        for m in AVAILABLE_MODELS:
            if m["id"] == model_id:
                self.selected_model_id = model_id
                return True
        return False

    def get_active_model(self) -> Optional[Dict[str, Any]]:
        for m in AVAILABLE_MODELS:
            if m["id"] == self.selected_model_id:
                return m
        return None

    def _get_provider_for_model(self, model_id: str) -> str:
        for m in AVAILABLE_MODELS:
            if m["id"] == model_id:
                return m["provider"]
        return "rule_based"

    def generate_completion(self, prompt: str, system_prompt: str = "") -> str:
        """
        Call the selected AI provider. Falls back to empty string
        (triggers deterministic engineering engine) if key unavailable.
        """
        provider = self._get_provider_for_model(self.selected_model_id)
        key = self._api_keys.get(provider, "")

        if provider == "gemini" and key:
            return self._call_gemini(prompt, system_prompt, key)
        elif provider == "openai" and key:
            return self._call_openai(prompt, system_prompt, key)
        elif provider == "anthropic" and key:
            return self._call_anthropic(prompt, system_prompt, key)
        elif provider == "groq" and key:
            return self._call_openai_compat(
                prompt, system_prompt, key,
                base_url="https://api.groq.com/openai/v1",
                model=self.selected_model_id
            )
        elif provider == "deepseek" and key:
            return self._call_openai_compat(
                prompt, system_prompt, key,
                base_url="https://api.deepseek.com",
                model=self.selected_model_id
            )
        elif provider == "mistral" and key:
            return self._call_openai_compat(
                prompt, system_prompt, key,
                base_url="https://api.mistral.ai/v1",
                model=self.selected_model_id
            )
        elif provider == "xai" and key:
            return self._call_openai_compat(
                prompt, system_prompt, key,
                base_url="https://api.x.ai/v1",
                model=self.selected_model_id
            )
        elif provider == "ollama":
            return self._call_ollama(prompt, system_prompt)

        return ""  # Deterministic fallback

    def _call_gemini(self, prompt: str, system: str, key: str) -> str:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.selected_model_id}:generateContent?key={key}"
            full_prompt = f"{system}\n\n{prompt}" if system else prompt
            payload = {"contents": [{"parts": [{"text": full_prompt}]}]}
            req = urllib.request.Request(
                url, data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            return ""

    def _call_openai(self, prompt: str, system: str, key: str) -> str:
        return self._call_openai_compat(
            prompt, system, key,
            base_url="https://api.openai.com/v1",
            model=self.selected_model_id
        )

    def _call_openai_compat(self, prompt: str, system: str, key: str, base_url: str, model: str) -> str:
        """OpenAI-compatible chat completions endpoint (used by OpenAI, Groq, DeepSeek, Mistral, xAI)."""
        try:
            url = f"{base_url}/chat/completions"
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            payload = {"model": model, "messages": messages, "max_tokens": 4096}
            req = urllib.request.Request(
                url, data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {key}"
                }
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"]
        except Exception:
            return ""

    def _call_anthropic(self, prompt: str, system: str, key: str) -> str:
        try:
            url = "https://api.anthropic.com/v1/messages"
            payload = {
                "model": self.selected_model_id,
                "max_tokens": 4096,
                "messages": [{"role": "user", "content": prompt}]
            }
            if system:
                payload["system"] = system
            req = urllib.request.Request(
                url, data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01"
                }
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["content"][0]["text"]
        except Exception:
            return ""

    def _call_ollama(self, prompt: str, system: str) -> str:
        try:
            model_name = self.selected_model_id.replace("ollama/", "")
            url = f"{settings.ollama_base_url}/api/chat"
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            payload = {"model": model_name, "messages": messages, "stream": False}
            req = urllib.request.Request(
                url, data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["message"]["content"]
        except Exception:
            return ""


# Singleton
llm_service = LLMProvider()
