from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging

# Routes
from app.routes import user, question, food_update, behavior, goal, tips, big_five

# Model preload manager
from models import llm_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Mindful Eating Backend", version="1.0")

# CORS
origins = [
    "http://localhost:8081",
    "http://localhost:8082",
    "http://192.168.2.16:8082",
    "http://192.168.2.16:19006",
    "http://192.168.2.16",
    "exp://192.168.2.16:8082"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(user.router, prefix="/auth", tags=["Authentication"])
app.include_router(question.router, prefix="/question", tags=["Question"])
app.include_router(behavior.router, prefix="/behavior", tags=["Behavior"])
app.include_router(goal.router, prefix="/goal", tags=["Goal"])
app.include_router(tips.router, prefix="/tips", tags=["Tips"])
app.include_router(food_update.router, prefix="/food-update", tags=["Food Update"])
app.include_router(big_five.router, prefix="/big-five", tags=["Big Five Traits"])


@app.get("/")
def root():
    return {"message": "API is running ======= "}


@app.on_event("startup")
async def preload_models():
    """Load heavy models BEFORE dashboard or login is hit."""
    logger.info("Preloading models...")

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, llm_manager.preload_all_models)

        logger.info("All models preloaded successfully.")

    except Exception as e:
        logger.error(f"Model preload failed: {e}")