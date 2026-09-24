import os
import json
import logging
import httpx
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

logger = logging.getLogger("AIProvider")

class AIProviderError(Exception):
    """Custom exception raised when an AI provider fails to generate or parse response."""
    pass

class GeminiProvider:
    def __init__(self, model_name: str = 'gemini-3.6-flash'):
        api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if not api_key:
            logger.warning("GEMINI_API_KEY is not set in environment.")
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(model_name)

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
            
            # Clear markdown
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
                
            return json.loads(text.strip())
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise AIProviderError(f"Gemini JSON generation failed: {e}") from e

class OpenAICompatibleProvider:
    def __init__(self, model_name: str = "gpt-4o-mini", api_key: str = None, base_url: str = "https://api.openai.com/v1"):
        self.model_name = model_name
        self.api_key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
        self.base_url = base_url.rstrip("/")

    async def analyze_json(self, prompt: str, schema: str = "") -> Dict[str, Any]:
        if not self.api_key:
            raise AIProviderError("OPENAI_API_KEY is not configured.")

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
                    raise AIProviderError(f"OpenAI API error {resp.status_code}: {resp.text}")
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content.strip())
            except Exception as e:
                logger.error(f"OpenAI API error: {e}")
                raise AIProviderError(f"OpenAI JSON generation failed: {e}") from e

def get_ai_provider(provider: str = "google", model_name: str = "gemini-3.6-flash"):
    """
    Factory function to instantiate the correct provider based on configuration.
    Falls back to Gemini if alternative provider keys are missing.
    """
    prov = (provider or "google").lower()
    if prov in ("openai", "azure", "mistral", "custom"):
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            return OpenAICompatibleProvider(model_name=model_name, api_key=openai_key)
        logger.warning(f"Provider '{provider}' requested, but OPENAI_API_KEY not found. Falling back to Gemini.")

    return GeminiProvider(model_name=model_name or "gemini-3.6-flash")
