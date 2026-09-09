from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from app.config.settings import settings
from app.api import auth, users, exams, questions, submissions, proctoring, agents, compiler
from app.services.course_generator import generation_worker_loop

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(generation_worker_loop())

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers mapped exactly to React endpoint roots
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(exams.router, prefix=settings.API_V1_STR)
app.include_router(exams.course_router, prefix=settings.API_V1_STR)
app.include_router(exams.module_router, prefix=settings.API_V1_STR)
app.include_router(exams.quiz_router, prefix=settings.API_V1_STR)
app.include_router(exams.challenge_router, prefix=settings.API_V1_STR)
app.include_router(questions.router, prefix=settings.API_V1_STR)
app.include_router(submissions.router, prefix=settings.API_V1_STR)
app.include_router(proctoring.router, prefix=settings.API_V1_STR)
app.include_router(agents.router, prefix=settings.API_V1_STR)
app.include_router(compiler.router, prefix=settings.API_V1_STR)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "message": "Rebuilt backend is operational and fully synchronized with the React frontend."
    }
