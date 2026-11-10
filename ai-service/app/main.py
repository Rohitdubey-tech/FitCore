from fastapi import FastAPI
from app.routes.chat import router as chat_router
from app.routes.diet import router as diet_router
from app.routes.health import router as health_router
from app.routes.workout import router as workout_router

app = FastAPI(
    title="FITCORE AI Service",
    version="1.0.0",
    description="Dedicated FastAPI microservice for AI Diet, Workout, Meal Analysis, and Fitness Assistant",
)

app.include_router(health_router)
app.include_router(diet_router)
app.include_router(workout_router)
app.include_router(chat_router)
