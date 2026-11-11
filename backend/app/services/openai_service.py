"""
OpenAI service wrapper for use outside agents (e.g., direct API calls).
"""
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenAIService:
    def __init__(self):
        self.client = None
        self._initialize()

    def _initialize(self):
        if settings.openai_configured:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=15.0)
                logger.info("OpenAIService initialized")
            except Exception as e:
                logger.warning(f"OpenAIService init failed: {e}")

    @property
    def available(self) -> bool:
        return self.client is not None

    def chat(
        self,
        prompt: str,
        system: str = "You are a helpful assistant.",
        model: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> Optional[str]:
        if not self.client:
            return None
        try:
            response = self.client.chat.completions.create(
                model=model or settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenAIService.chat failed: {type(e).__name__}: {e}")
            return None


openai_service = OpenAIService()
