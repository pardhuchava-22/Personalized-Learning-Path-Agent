from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    QuestionSubmissionViewSet, MCQSubmissionViewSet, CodingSubmissionViewSet
)

router = DefaultRouter()
router.register(r'questions', QuestionSubmissionViewSet, basename='question-submission')
router.register(r'mcq', MCQSubmissionViewSet, basename='mcq-submission')
router.register(r'coding', CodingSubmissionViewSet, basename='coding-submission')

urlpatterns = [
    path('', include(router.urls)),
]
