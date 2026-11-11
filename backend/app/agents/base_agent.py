from typing import Optional
import logging

logger = logging.getLogger(__name__)


class BaseAgent:
    name = "BaseAgent"

    def __init__(self, settings):
        self.settings = settings
        self.openai_client = None
        if settings.openai_configured:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    timeout=15.0
                )
                logger.info(f"{self.name}: OpenAI client initialized")
            except Exception as e:
                logger.warning(f"{self.name}: OpenAI init failed: {e}")

    def llm_available(self) -> bool:
        return self.openai_client is not None

    def safe_llm_call(
        self,
        prompt: str,
        system: str = "You are a disaster response AI assistant.",
        max_tokens: int = 500,
    ) -> Optional[str]:
        if not self.openai_client:
            return None
        try:
            response = self.openai_client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.3,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"{self.name}: LLM call failed: {type(e).__name__}")
            return None
