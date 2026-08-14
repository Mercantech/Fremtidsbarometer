import os
import json
import logging
import google.generativeai as genai
from typing import Dict, Any

logger = logging.getLogger("AIProvider")

class AIProviderError(Exception):
    """Custom exception raised when an AI provider fails to generate or parse response."""
    pass

class GeminiProvider:
    def __init__(self, model_name: str = 'gemini-3.6-flash'):
        api_key = os.getenv("GEMINI_API_KEY")
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
        if not os.getenv("GEMINI_API_KEY"):
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
