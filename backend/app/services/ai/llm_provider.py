import os
import json
from typing import Dict, Any, Optional
import urllib.request
import urllib.error
from backend.app.config import settings

class LLMProvider:
    """Unified abstraction for AI providers with offline/deterministic fallback."""
    
    def __init__(self):
        self.provider = "rule_based"
        self._detect_provider()

    def _detect_provider(self):
        if settings.gemini_api_key:
            self.provider = "gemini"
        elif settings.openai_api_key:
            self.provider = "openai"
        elif settings.anthropic_api_key:
            self.provider = "anthropic"
        else:
            self.provider = "rule_based"

    def set_api_key(self, provider: str, key: str):
        if provider == "gemini":
            settings.gemini_api_key = key
        elif provider == "openai":
            settings.openai_api_key = key
        elif provider == "anthropic":
            settings.anthropic_api_key = key
        self._detect_provider()

    def generate_completion(self, prompt: str, system_prompt: str = "") -> str:
        """Calls active cloud provider or returns empty to signal rule-based fallback."""
        if self.provider == "gemini" and settings.gemini_api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
                payload = {
                    "contents": [{"parts": [{"text": f"{system_prompt}\n\n{prompt}"}]}]
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    return res_data["candidates"][0]["content"]["parts"][0]["text"]
            except Exception:
                pass

        # If offline or rule-based, return empty to invoke deterministic engineering engine
        return ""

llm_service = LLMProvider()

