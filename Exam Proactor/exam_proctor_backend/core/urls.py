"""
URL configuration for Exam Proctor Backend project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.response import Response
from rest_framework.views import APIView
from exam_proctor_backend.apps.exams.views import (
    module_detail_api, update_module_progress_api, get_module_quiz_api,
    submit_quiz_attempt_api, get_module_challenge_api, submit_challenge_attempt_api,
    module_chat_api
)

class APIRootView(APIView):
    """API Root endpoint with welcome message and endpoint list."""
    
    def get(self, request):
        return Response({
            'message': 'Welcome to Exam Proctor Backend API',
            'version': '1.0',
            'endpoints': {
                'admin': '/admin/',
                'auth': {
                    'token': '/api/auth/token/',
                    'token_refresh': '/api/auth/token/refresh/',
                },
                'users': '/api/users/',
                'exams': '/api/exams/',
                'questions': '/api/questions/',
                'submissions': '/api/submissions/',
                'proctoring': '/api/proctoring/',
            },
            'documentation': '/documentation/',
            'status': 'running'
        })

urlpatterns = [
    # Frontend
    path('', TemplateView.as_view(template_name='index.html'), name='index'),
    path('exams/', TemplateView.as_view(template_name='index.html'), name='exams'),
    path('profile/', TemplateView.as_view(template_name='index.html'), name='profile'),
    
    # API
    path('api/', APIRootView.as_view(), name='api-root'),
    path('admin/', admin.site.urls),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('api/users/', include('exam_proctor_backend.apps.users.urls')),
    path('api/exams/', include('exam_proctor_backend.apps.exams.urls')),
    path('api/questions/', include('exam_proctor_backend.apps.questions.urls')),
    path('api/submissions/', include('exam_proctor_backend.apps.submissions.urls')),
    path('api/proctoring/', include('exam_proctor_backend.apps.proctoring.urls')),
    
    # Module & dynamic quiz/challenge learning APIs
    path('api/module/<int:module_id>', module_detail_api, name='module_detail_api'),
    path('api/module/<int:module_id>/progress', update_module_progress_api, name='update_module_progress_api'),
    path('api/module/<int:module_id>/chat', module_chat_api, name='module_chat_api'),
    path('api/module/<int:module_id>/quiz', get_module_quiz_api, name='get_module_quiz_api'),
    path('api/quiz/submit', submit_quiz_attempt_api, name='submit_quiz_attempt_api'),
    path('api/module/<int:module_id>/challenge', get_module_challenge_api, name='get_module_challenge_api'),
    path('api/challenge/submit', submit_challenge_attempt_api, name='submit_challenge_attempt_api'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
