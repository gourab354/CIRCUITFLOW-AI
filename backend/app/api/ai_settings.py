"""
AI Settings API — Model selection, API key management, provider status.
No subscription system. Users bring their own keys.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict
from backend.app.services.ai.llm_provider import llm_service, AVAILABLE_MODELS

router = APIRouter(prefix="/ai-settings", tags=["AI Settings"])


class SetKeyRequest(BaseModel):
    provider: str
    api_key: str


class SetModelRequest(BaseModel):
    model_id: str


@router.get("/models")
def list_models():
    """List all available AI models with key status."""
    return {
        "models": llm_service.get_available_models(),
        "active_model": llm_service.selected_model_id,
        "active_model_info": llm_service.get_active_model()
    }


@router.post("/set-model")
def set_active_model(req: SetModelRequest):
    """Switch the active AI model."""
    success = llm_service.set_model(req.model_id)
    if not success:
        return {"status": "error", "message": f"Unknown model: {req.model_id}"}
    return {
        "status": "ok",
        "active_model": req.model_id,
        "model_info": llm_service.get_active_model()
    }


@router.post("/set-key")
def set_api_key(req: SetKeyRequest):
    """Configure an API key for a provider. Keys stored in-memory only, never persisted to disk."""
    if not req.api_key.strip():
        return {"status": "error", "message": "API key cannot be empty"}
    llm_service.set_api_key(req.provider, req.api_key.strip())
    # Auto-switch to the best model for this provider if no model is currently active with a key
    defaults = {
        "gemini": "gemini-2.0-flash-exp",
        "openai": "gpt-4o-mini",
        "anthropic": "claude-3-5-haiku-20241022",
        "groq": "llama-3.3-70b-versatile",
        "deepseek": "deepseek-chat",
        "mistral": "mistral-large-latest",
        "xai": "grok-2-latest",
    }
    if req.provider in defaults:
        llm_service.set_model(defaults[req.provider])
    return {
        "status": "ok",
        "provider": req.provider,
        "active_model": llm_service.selected_model_id
    }


@router.get("/providers")
def list_providers():
    """List all supported providers and their key status."""
    providers = [
        {"id": "gemini", "name": "Google Gemini", "url": "https://aistudio.google.com/apikey",
         "has_key": bool(llm_service._api_keys.get("gemini"))},
        {"id": "openai", "name": "OpenAI (GPT-4o)", "url": "https://platform.openai.com/api-keys",
         "has_key": bool(llm_service._api_keys.get("openai"))},
        {"id": "anthropic", "name": "Anthropic Claude", "url": "https://console.anthropic.com/settings/keys",
         "has_key": bool(llm_service._api_keys.get("anthropic"))},
        {"id": "groq", "name": "Groq (Ultra-Fast)", "url": "https://console.groq.com/keys",
         "has_key": bool(llm_service._api_keys.get("groq"))},
        {"id": "deepseek", "name": "DeepSeek", "url": "https://platform.deepseek.com/api_keys",
         "has_key": bool(llm_service._api_keys.get("deepseek"))},
        {"id": "mistral", "name": "Mistral AI", "url": "https://console.mistral.ai/api-keys",
         "has_key": bool(llm_service._api_keys.get("mistral"))},
        {"id": "xai", "name": "xAI (Grok)", "url": "https://console.x.ai",
         "has_key": bool(llm_service._api_keys.get("xai"))},
        {"id": "ollama", "name": "Ollama (Local / Free)", "url": "https://ollama.com",
         "has_key": True},
    ]
    return {"providers": providers}


@router.get("/status")
def ai_status():
    """Get current AI engine status."""
    model = llm_service.get_active_model()
    provider = model["provider"] if model else "rule_based"
    has_key = llm_service._api_keys.get(provider, "") not in ("", None) if provider != "ollama" else True
    return {
        "active_model": llm_service.selected_model_id,
        "provider": provider,
        "ready": has_key,
        "mode": "cloud" if provider not in ("ollama", "rule_based") else provider,
        "fallback": "deterministic_engineering_engine"
    }
