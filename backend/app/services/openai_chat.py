import os
import logging
from typing import Optional
from openai import OpenAI  # pip install openai

logger = logging.getLogger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are a supportive, evidence-informed mindful eating assistant.
Your role is ONLY to answer questions related to food, diet, eating habits, nutrition, mindful eating, cravings, emotional eating, portion control, or healthy routines.

If the user asks about anything unrelated (such as sports, travel, geography, politics, celebrities, news, technology, or general world questions), politely refuse and say:
"I'm here to help with mindful eating, food choices, and healthy habits. Please ask me something related to your diet or eating patterns."

Give your response in 4–5 short sentences, plain text only, without bullet points, without markdown, and without special formatting. 
Keep the tone warm, friendly, practical, and easy to understand.
If the user mentions medical issues, remind them to consult a healthcare professional.
"""


def generate_openai_reply(user_message: str, user_context: Optional[str] = None) -> str:
    try:
        content = user_message if not user_context else f"User profile/context:\n{user_context}\n\nUser question:\n{user_message}"

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            temperature=0.7,
            max_tokens=400,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"Error calling OpenAI: {e}")
        return "I'm sorry, something went wrong while generating a response. Please try again in a moment."