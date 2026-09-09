from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, MCQQuestionViewSet, CodingQuestionViewSet

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'mcq', MCQQuestionViewSet, basename='mcq')
router.register(r'coding', CodingQuestionViewSet, basename='coding')

urlpatterns = [
    path('', include(router.urls)),
]
