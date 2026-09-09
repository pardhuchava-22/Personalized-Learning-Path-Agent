from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamViewSet, ExamEnrollmentViewSet, CourseViewSet
from .analytics_views import FacultyAnalyticsView
from .agent_views import (
    DiagnoseAPIView, SessionListAPIView, SessionDetailAPIView,
    RequestApprovalAPIView, AdoptPathAPIView, SubmitExerciseAPIView,
    FacultyAlertsAPIView, FacultyActionAPIView,
    StudentExamsSummaryAPIView,
    RemediationListAPIView, RemediationSubmitPracticeAPIView,
    NotificationListAPIView, NotificationMarkReadAPIView, NotificationMarkAllReadAPIView
)

router = DefaultRouter()
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'enrollments', ExamEnrollmentViewSet, basename='enrollment')
router.register(r'courses', CourseViewSet, basename='course')

urlpatterns = [
    path('courses/verify/<int:pk>', CourseViewSet.as_view({'get': 'verify_course'}), name='course-verify-legacy'),
    
    
    # ── Code Remediation Track Routes ──
    path('remediation/', RemediationListAPIView.as_view(), name='remediation-list'),
    path('remediation/<int:item_id>/complete/', RemediationSubmitPracticeAPIView.as_view(), name='remediation-complete'),

    # ── Notification Routes ──
    path('notifications/', NotificationListAPIView.as_view(), name='notification-list'),
    path('notifications/<int:notification_id>/read/', NotificationMarkReadAPIView.as_view(), name='notification-read'),
    path('notifications/mark-all-read/', NotificationMarkAllReadAPIView.as_view(), name='notification-mark-all-read'),

    # ── Personalized Learning Path Multi-Agent System Routes ──
    path('learning-agent/student-exams/', StudentExamsSummaryAPIView.as_view(), name='learning-agent-student-exams'),
    path('learning-agent/diagnose/', DiagnoseAPIView.as_view(), name='learning-agent-diagnose'),
    path('learning-agent/sessions/', SessionListAPIView.as_view(), name='learning-agent-sessions'),
    path('learning-agent/sessions/<int:session_id>/', SessionDetailAPIView.as_view(), name='learning-agent-session-detail'),
    path('learning-agent/sessions/<int:session_id>/request-approval/', RequestApprovalAPIView.as_view(), name='learning-agent-request-approval'),
    path('learning-agent/sessions/<int:session_id>/adopt/', AdoptPathAPIView.as_view(), name='learning-agent-adopt'),
    path('learning-agent/sessions/<int:session_id>/submit-exercise/', SubmitExerciseAPIView.as_view(), name='learning-agent-submit-exercise'),
    path('learning-agent/faculty/alerts/', FacultyAlertsAPIView.as_view(), name='learning-agent-faculty-alerts'),
    path('learning-agent/faculty/action/', FacultyActionAPIView.as_view(), name='learning-agent-faculty-action'),

    path('', include(router.urls)),
    path('analytics/faculty/', FacultyAnalyticsView.as_view(), name='faculty-analytics'),
]
