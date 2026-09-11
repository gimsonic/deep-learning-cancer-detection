import warnings
warnings.filterwarnings("ignore", message=".*Protobuf gencode.*", category=UserWarning)

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.predict import router as predict_router
from app.services.inference import load_models

# Application lifespan context manager to load models at startup to prevent FastAPI from freezing 
@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(load_models)
    yield # Models are loaded and ready to use for the duration of the app's lifespan

# FastAPI application setup with metadata and CORS configuration
app = FastAPI(
    title = "Multi Cancer Detection System API",
    version = "1.0",
    description = (
        "2-stage deep learning pipeline for breast, lung, skin, and oral cancer detection. "
        "Stage 1 classifies Normal vs Abnormal; Stage 2 classifies Benign vs Malignant."
    ),
    lifespan = lifespan,
)

# CORS middleware to allow requests from the Next.js frontend 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://curiesense.tech", "https://www.curiesense.tech", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the prediction router which defines the '/predict' endpoint
# (Router connection)
app.include_router(predict_router)


# ----- GET METHODS -----

# Root and health check endpoints for basic API status verification
@app.get("/", tags=["Health"])
def root():
    return {"message": "Multi Cancer Detection API is running."}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}