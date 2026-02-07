from fastapi import APIRouter

from app.api.api_v1.endpoints import (admin, auth, bookings, exercises,
                                      gym_analytics, gyms, templates,
                                      test_utils, trainers, users)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(trainers.router, prefix="/trainers", tags=["trainers"])
api_router.include_router(gyms.router, prefix="/gyms", tags=["gyms"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
# api_router.include_router(
#     analytics.router, prefix="/analytics", tags=["analytics"]
# )
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])
api_router.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(gym_analytics.router, prefix="/gyms", tags=["analytics"])
api_router.include_router(test_utils.router, prefix="/test-utils", tags=["test-utils"])
