from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProctoringViolationViewSet, ExamSessionViewSet, ActivityLogViewSet, ScreenCaptureViewSet
)

router = DefaultRouter()
router.register(r'violations', ProctoringViolationViewSet, basename='violation')
router.register(r'sessions', ExamSessionViewSet, basename='session')
router.register(r'activities', ActivityLogViewSet, basename='activity')
router.register(r'screenshots', ScreenCaptureViewSet, basename='screenshot')

urlpatterns = [
    path('', include(router.urls)),
]
