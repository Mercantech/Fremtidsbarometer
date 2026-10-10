import os
import json
import logging
import httpx
from typing import Dict, Any, Optional, List, Tuple, Union, overload, Literal
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

# Standard token pricing in USD per 1M tokens
MODEL_PRICING = {
    "gemini-3.8-flash": {"input": 0.075 / 1_000_000, "output": 0.30 / 1_000_000},
    "gemini-2.0-flash": {"input": 0.075 / 1_000_000, "output": 0.30 / 1_000_000},
    "gemini-1.5-flash": {"input": 0.075 / 1_000_000, "output": 0.30 / 1_000_000},
    "gpt-4o-mini":      {"input": 0.150 / 1_000_000, "output": 0.60 / 1_000_000},
    "open-mistral-nemo":{"input": 0.150 / 1_000_000, "output": 0.15 / 1_000_000},
    "default":          {"input": 0.100 / 1_000_000, "output": 0.30 / 1_000_000},
}

# Standard mapping: provider slug -> primary environment variable name
PROVIDER_ENV_VARS: Dict[str, str] = {
    "google": "GEMINI_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "openai": "OPENAI_API_KEY",
    "groq": "GROQ_API_KEY",
    "azure": "OPENAI_API_KEY",
    "custom": "OPENAI_API_KEY",
}


def check_provider_key_present(provider: str) -> Tuple[str, bool]:
    """Returns (env_var_name, is_configured) for a given provider."""
    p_norm = (provider or "google").strip().lower()
    env_var = PROVIDER_ENV_VARS.get(p_norm, f"{p_norm.upper()}_API_KEY")
    val = (os.getenv(env_var) or "").strip()
    return env_var, bool(val)


def verify_provider_keys(db) -> List[Dict[str, Any]]:
    """
    Checks environment keys for ALL providers configured in ai_model_configs
    (including both active models and fallback models).
    Writes WARNING to SystemLog if keys are missing (never logging key values).
    Returns list of provider status records.
    """
    from database.models import AIModelConfig, SystemLog

    try:
        models = db.query(AIModelConfig).all()
    except Exception as e:
        logger.warning(f"Could not query AIModelConfig for key verification: {e}")
        return []

    # Map provider -> {'active': int, 'fallback': int, 'total': int}
    prov_map: Dict[str, Dict[str, int]] = {}
    for m in models:
        p = (m.provider or "google").strip().lower()
        if p not in prov_map:
            prov_map[p] = {"active": 0, "fallback": 0, "total": 0}
        prov_map[p]["total"] += 1
        if m.is_active == 1:
            prov_map[p]["active"] += 1
        elif m.is_fallback == 1:
            prov_map[p]["fallback"] += 1

    results = []
    for p, counts in prov_map.items():
        env_var, is_present = check_provider_key_present(p)
        results.append({
            "provider": p,
            "env_var": env_var,
            "is_configured": is_present,
            "active_count": counts["active"],
            "fallback_count": counts["fallback"]
        })

        if not is_present:
            if counts["active"] > 0:
                msg = (
                    f"Active AI provider '{p}' has no key set in environment ({env_var}). "
                    f"Active models for this provider will fail until the key is set."
                )
                logger.warning(f"⚠️ {msg}")
                try:
                    db.add(SystemLog(
                        level="WARNING",
                        component="AIProviderEnvCheck",
                        message=msg,
                        metadata_={"provider": p, "env_var": env_var, "status": "active_provider_missing_key"}
                    ))
                    db.commit()
                except Exception as log_e:
                    db.rollback()
                    logger.warning(f"Failed to write missing key warning to SystemLog: {log_e}")

            elif counts["fallback"] > 0:
                msg = (
                    f"Fallback AI provider '{p}' has no key set in environment ({env_var}). "
                    f"(fallback provider has no key)"
                )
                logger.warning(f"⚠️ {msg}")
                try:
                    db.add(SystemLog(
                        level="WARNING",
                        component="AIProviderEnvCheck",
                        message=msg,
                        metadata_={"provider": p, "env_var": env_var, "status": "fallback_provider_missing_key"}
                    ))
                    db.commit()
                except Exception as log_e:
                    db.rollback()
                    logger.warning(f"Failed to write missing key warning to SystemLog: {log_e}")

    return results


def calculate_token_cost(model_name: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculates approximate USD cost for token usage."""
    cleaned = (model_name or "").lower()
    pricing = MODEL_PRICING.get("default")
    for key, price_info in MODEL_PRICING.items():
        if key in cleaned:
            pricing = price_info
            break
    cost = (prompt_tokens * pricing["input"]) + (completion_tokens * pricing["output"])
    return round(cost, 6)


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

        # Normalize model name: strip "models/" prefix if present, otherwise pass exact ID
        cleaned_name = (model_name or "gemini-3.8-flash").strip()
        if cleaned_name.startswith("models/"):
            cleaned_name = cleaned_name[len("models/"):]

        self.model_name = cleaned_name
        self.model = genai.GenerativeModel(cleaned_name)

    async def analyze_json_with_meta(self, prompt: str, schema: str = "") -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Sends prompt to Gemini, validates JSON response and returns (data, meta).
        Meta includes prompt_tokens, completion_tokens, and cost_usd.
        """
        api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if not api_key:
            raise AIProviderError("GEMINI_API_KEY environment variable is not configured.")

        full_prompt = f"{prompt}\n\nMust return ONLY valid JSON. {schema}"

        try:
            response = await self.model.generate_content_async(full_prompt)
            text = response.text

            # Token tracking
            usage_meta = getattr(response, "usage_metadata", None)
            prompt_tokens = getattr(usage_meta, "prompt_token_count", 0) if usage_meta else 0
            completion_tokens = getattr(usage_meta, "candidates_token_count", 0) if usage_meta else 0
            cost = calculate_token_cost(self.model_name, prompt_tokens, completion_tokens)

            # Clear markdown formatting
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            parsed = json.loads(text.strip())
            meta = {
                "provider": "google",
                "model_name": self.model_name,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "cost_usd": cost,
            }
            return parsed, meta
        except Exception as e:
            logger.error(f"Gemini API error ({self.model_name}): {e}")
            raise AIProviderError(f"Gemini JSON generation failed for model '{self.model_name}': {e}") from e

    async def analyze_json(self, prompt: str, schema: str = "") -> Dict[str, Any]:
        """Backward-compatible helper returning only the data dict."""
        data, _ = await self.analyze_json_with_meta(prompt, schema)
        return data


class OpenAICompatibleProvider:
    def __init__(self, model_name: str = "gpt-4o-mini", api_key: str = None, base_url: str = "https://api.openai.com/v1"):
        self.model_name = model_name
        self.api_key = (api_key or os.getenv("OPENAI_API_KEY") or "").strip()
        self.base_url = base_url.rstrip("/")

    async def analyze_json_with_meta(self, prompt: str, schema: str = "") -> Tuple[Dict[str, Any], Dict[str, Any]]:
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

                usage = data.get("usage", {})
                p_tok = usage.get("prompt_tokens", 0)
                c_tok = usage.get("completion_tokens", 0)
                cost = calculate_token_cost(self.model_name, p_tok, c_tok)

                meta = {
                    "provider": "openai_compatible",
                    "model_name": self.model_name,
                    "prompt_tokens": p_tok,
                    "completion_tokens": c_tok,
                    "cost_usd": cost,
                }
                return json.loads(content.strip()), meta
            except Exception as e:
                logger.error(f"AI API error ({self.base_url}): {e}")
                raise AIProviderError(f"AI JSON generation failed: {e}") from e

    async def analyze_json(self, prompt: str, schema: str = "") -> Dict[str, Any]:
        """Backward-compatible helper returning only the data dict."""
        data, _ = await self.analyze_json_with_meta(prompt, schema)
        return data


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


@overload
async def analyze_with_fallback(
    candidates: List[Dict[str, Any]],
    prompt: str,
    schema: str = "",
    return_meta: Literal[False] = False,
) -> Dict[str, Any]:
    ...


@overload
async def analyze_with_fallback(
    candidates: List[Dict[str, Any]],
    prompt: str,
    schema: str = "",
    return_meta: Literal[True] = ...,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    ...


async def analyze_with_fallback(
    candidates: List[Dict[str, Any]],
    prompt: str,
    schema: str = "",
    return_meta: bool = False
) -> Union[Dict[str, Any], Tuple[Dict[str, Any], Dict[str, Any]]]:
    """
    Executes analyze_json trying each candidate model in order.
    Transitions to the next fallback model on provider errors (404, rate limit, quota, timeout).
    Raises AIProviderError only if all candidates fail.
    If return_meta=True, returns (result, meta_dict).
    """
    if not candidates:
        candidates = [{"provider": "google", "model_name": "gemini-3.8-flash"}]

    last_error = None
    for idx, cand in enumerate(candidates):
        provider = cand.get("provider", "google")
        model_name = cand.get("model_name", "gemini-3.8-flash")

        try:
            logger.info(f"Invoking AI model: {provider} / {model_name}...")
            ai = get_ai_provider(provider=provider, model_name=model_name)
            result, meta = await ai.analyze_json_with_meta(prompt, schema)
            if result:
                meta["fallback_used"] = (idx > 0)
                logger.info(
                    f"AI response successfully generated by {provider}/{model_name}. "
                    f"Tokens: {meta.get('prompt_tokens', 0)}+{meta.get('completion_tokens', 0)} "
                    f"(${meta.get('cost_usd', 0.0):.6f})"
                )
                if return_meta:
                    return result, meta
                return result
        except AIProviderError as e:
            last_error = e
            logger.warning(f"AI model {provider}/{model_name} failed: {e}. Transitioning to fallback...")
        except Exception as e:
            last_error = e
            logger.warning(f"Unexpected error with {provider}/{model_name}: {e}. Transitioning to fallback...")

    raise AIProviderError(f"All candidate AI models failed. Last error: {last_error}") from last_error


async def test_model_connection(provider: str, model_name: str, max_tokens: int = 16) -> Dict[str, Any]:
    """
    Sends a minimal live prompt to verify provider API key validity and model availability.
    Limit response to ~16 tokens.
    Empty response with HTTP 200 is considered success ('ответ пустой').
    """
    import time
    p_norm = (provider or "google").strip().lower()
    m_name = (model_name or "").strip()
    if m_name.startswith("models/"):
        m_name = m_name[len("models/"):]

    env_var, is_configured = check_provider_key_present(p_norm)
    if not is_configured:
        return {
            "success": False,
            "status": "error",
            "latency_ms": 0,
            "message": f"API key not found in environment ({env_var}). Please add it to your .env file."
        }

    start_time = time.time()
    try:
        if p_norm == "google":
            api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(m_name)
            generation_config = genai.types.GenerationConfig(max_output_tokens=max_tokens)
            resp = await model.generate_content_async("ping", generation_config=generation_config)
            latency_ms = int((time.time() - start_time) * 1000)
            text_out = (getattr(resp, "text", None) or "").strip()
            if not text_out:
                return {
                    "success": True,
                    "status": "ok",
                    "latency_ms": latency_ms,
                    "message": f"Model responded in {latency_ms}ms (empty response)"
                }
            return {
                "success": True,
                "status": "ok",
                "latency_ms": latency_ms,
                "message": f"Model responded in {latency_ms}ms: {text_out[:100]}"
            }
        else:
            # OpenAI compatible (OpenAI, Mistral, Groq, custom)
            if p_norm == "mistral":
                api_key = os.getenv("MISTRAL_API_KEY", "")
                base_url = "https://api.mistral.ai/v1"
            elif p_norm == "groq":
                api_key = os.getenv("GROQ_API_KEY", "")
                base_url = "https://api.groq.com/openai/v1"
            else:
                api_key = os.getenv("OPENAI_API_KEY", "")
                base_url = "https://api.openai.com/v1"

            headers = {
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": m_name,
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": max_tokens
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
                latency_ms = int((time.time() - start_time) * 1000)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    content = ""
                    if choices:
                        content = (choices[0].get("message", {}).get("content") or "").strip()
                    if not content:
                        return {
                            "success": True,
                            "status": "ok",
                            "latency_ms": latency_ms,
                            "message": f"Model responded in {latency_ms}ms (empty response)"
                        }
                    return {
                        "success": True,
                        "status": "ok",
                        "latency_ms": latency_ms,
                        "message": f"Model responded in {latency_ms}ms: {content[:100]}"
                    }
                else:
                    return {
                        "success": False,
                        "status": "error",
                        "latency_ms": latency_ms,
                        "message": f"HTTP {res.status_code}: {res.text[:300]}"
                    }
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "status": "error",
            "latency_ms": latency_ms,
            "message": f"Model invocation failed: {str(e)}"
        }
