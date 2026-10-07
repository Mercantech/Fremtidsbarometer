import os
import json
import logging
import httpx
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

logger = logging.getLogger("AIProvider")

DEPRECATED_GEMINI_MODELS = {
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-3.5-flash",
}


class AIProviderError(Exception):
    """Custom exception raised when an AI provider fails to generate or parse response."""
    pass


class GeminiProvider:
    def __init__(self, model_name: str = 'gemini-3.8-flash', api_key: Optional[str] = None):
        key = (api_key or os.getenv("GEMINI_API_KEY") or "").strip()
        if not key:
            logger.warning("GEMINI_API_KEY is not set in environment.")
        else:
            genai.configure(api_key=key)

        # Normalize model name: strip "models/" prefix if present
        cleaned_name = (model_name or "gemini-3.8-flash").strip()
        if cleaned_name.startswith("models/"):
            cleaned_name = cleaned_name[len("models/"):]

        # Auto-redirect any legacy or discontinued Gemini models to gemini-3.8-flash
        if cleaned_name in DEPRECATED_GEMINI_MODELS or "2.5-pro" in cleaned_name or "1.5-pro" in cleaned_name:
            logger.warning(
                f"Deprecated model '{cleaned_name}' requested. "
                "Redirecting to supported 'gemini-3.8-flash'."
            )
            cleaned_name = "gemini-3.8-flash"

        self.model_name = cleaned_name
        self.model = genai.GenerativeModel(cleaned_name)

    async def analyze_json(self, prompt: str, schema: str = "") -> Dict[str, Any]:
        """
        Sends prompt to Gemini and expects a validated JSON response.
        Raises AIProviderError on missing keys or generation failures.
        """
        api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if not api_key:
            raise AIProviderError("GEMINI_API_KEY environment variable is not configured.")

        full_prompt = f"{prompt}\n\nMust return ONLY valid JSON. {schema}"

        try:
            response = await self.model.generate_content_async(full_prompt)
            text = response.text

            # Clear markdown formatting
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            return json.loads(text.strip())
        except Exception as e:
            err_str = str(e).lower()
            # If model is unavailable (404 / no longer available / not found) and wasn't gemini-3.8-flash, retry with gemini-3.8-flash
            if self.model_name != "gemini-3.8-flash" and ("not found" in err_str or "404" in err_str or "no longer available" in err_str):
                logger.warning(f"Model '{self.model_name}' unavailable ({e}). Automatically retrying with 'gemini-3.8-flash'...")
                try:
                    fallback_model = genai.GenerativeModel("gemini-3.8-flash")
                    fallback_resp = await fallback_model.generate_content_async(full_prompt)
                    fb_text = fallback_resp.text
                    if "```json" in fb_text:
                        fb_text = fb_text.split("```json")[1].split("```")[0]
                    elif "```" in fb_text:
                        fb_text = fb_text.split("```")[1].split("```")[0]
                    return json.loads(fb_text.strip())
                except Exception as fb_err:
                    logger.error(f"Automatic retry with gemini-3.8-flash also failed: {fb_err}")

            logger.error(f"Gemini API error ({self.model_name}): {e}")
            raise AIProviderError(f"Gemini JSON generation failed: {e}") from e


class OpenAICompatibleProvider:
    def __init__(self, model_name: str = "gpt-4o-mini", api_key: str = None, base_url: str = "https://api.openai.com/v1"):
        self.model_name = model_name
        self.api_key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
        self.base_url = base_url.rstrip("/")

    async def analyze_json(self, prompt: str, schema: str = "") -> Dict[str, Any]:
        if not self.api_key:
            raise AIProviderError(f"API key for {self.base_url} is not configured.")

        full_prompt = f"{prompt}\n\nMust return ONLY valid JSON. {schema}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": "You are an analytical assistant that strictly outputs JSON."},
                {"role": "user", "content": full_prompt}
            ],
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if resp.status_code != 200:
                    raise AIProviderError(f"AI API error ({self.base_url}) {resp.status_code}: {resp.text}")
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content.strip())
            except Exception as e:
                logger.error(f"AI API error ({self.base_url}): {e}")
                raise AIProviderError(f"AI JSON generation failed: {e}") from e


def get_ai_provider(provider: str = "google", model_name: str = "gemini-3.8-flash", api_key: Optional[str] = None):
    """
    Factory function to instantiate the correct provider based on configuration.
    Falls back to Gemini if alternative provider keys are missing.
    """
    prov = (provider or "google").lower()

    if prov == "mistral":
        mistral_key = (api_key or os.getenv("MISTRAL_API_KEY") or "").strip()
        if mistral_key:
            target_model = model_name or "open-mistral-nemo"
            return OpenAICompatibleProvider(
                model_name=target_model,
                api_key=mistral_key,
                base_url="https://api.mistral.ai/v1"
            )
        logger.warning("Provider 'mistral' requested, but MISTRAL_API_KEY not found. Falling back to Gemini.")

    elif prov == "groq":
        groq_key = (api_key or os.getenv("GROQ_API_KEY") or "").strip()
        if groq_key:
            target_model = model_name or "llama-3.3-70b-versatile"
            return OpenAICompatibleProvider(
                model_name=target_model,
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1"
            )
        logger.warning("Provider 'groq' requested, but GROQ_API_KEY not found. Falling back to Gemini.")

    elif prov in ("openai", "azure", "custom"):
        openai_key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
        if openai_key:
            return OpenAICompatibleProvider(
                model_name=model_name or "gpt-4o-mini",
                api_key=openai_key,
                base_url="https://api.openai.com/v1"
            )
        logger.warning(f"Provider '{provider}' requested, but OPENAI_API_KEY not found. Falling back to Gemini.")

    return GeminiProvider(model_name=model_name or "gemini-3.8-flash", api_key=api_key)


async def analyze_with_fallback(
    candidates: List[Dict[str, Any]],
    prompt: str,
    schema: str = ""
) -> Dict[str, Any]:
    """
    Executes analyze_json trying each candidate model in order.
    Transitions to the next fallback model on provider errors (404, rate limit, quota, timeout).
    Raises AIProviderError only if all candidates fail.
    """
    if not candidates:
        candidates = [{"provider": "google", "model_name": "gemini-3.8-flash"}]

    last_error = None
    for cand in candidates:
        provider = cand.get("provider", "google")
        model_name = cand.get("model_name", "gemini-3.8-flash")
        api_key = cand.get("api_key")

        try:
            logger.info(f"Invoking AI model: {provider} / {model_name}...")
            ai = get_ai_provider(provider=provider, model_name=model_name, api_key=api_key)
            result = await ai.analyze_json(prompt, schema)
            if result:
                logger.info(f"AI response successfully generated by {provider} / {model_name}.")
                return result
        except AIProviderError as e:
            last_error = e
            logger.warning(f"AI model {provider}/{model_name} failed: {e}. Transitioning to fallback...")
        except Exception as e:
            last_error = e
            logger.warning(f"Unexpected error with {provider}/{model_name}: {e}. Transitioning to fallback...")

    raise AIProviderError(f"All candidate AI models failed. Last error: {last_error}") from last_error
