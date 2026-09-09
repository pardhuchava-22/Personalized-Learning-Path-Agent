from rest_framework import serializers
from exam_proctor_backend.apps.proctoring.models import (
    ProctoringViolation, ExamSession, ActivityLog, ScreenCapture
)

class ProctoringViolationSerializer(serializers.ModelSerializer):
    violation_type_display = serializers.CharField(source='get_violation_type_display', read_only=True)
    violation_title = serializers.CharField(source='get_violation_type_display', read_only=True)
    student_name = serializers.CharField(source='enrollment.student.get_full_name', read_only=True)
    evidence_path = serializers.SerializerMethodField()

    class Meta:
        model = ProctoringViolation
        fields = [
            'id', 'enrollment', 'violation_type', 'violation_type_display',
            'violation_title', 'evidence_path',
            'description', 'severity', 'evidence_screenshot', 'evidence_video_frame',
            'detections', 'detected_at', 'reviewed', 'reviewer_notes', 'student_name'
        ]
        read_only_fields = ['id', 'detected_at']

    def get_evidence_path(self, obj):
        return obj.evidence_screenshot.name if obj.evidence_screenshot else None

class ActivityLogSerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'activity_type', 'activity_type_display', 'description', 'metadata', 'timestamp']
        read_only_fields = ['id', 'timestamp']

class ScreenCaptureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScreenCapture
        fields = ['id', 'image', 'timestamp', 'reason', 'flagged', 'flag_reason']
        read_only_fields = ['id', 'timestamp']

class ExamSessionSerializer(serializers.ModelSerializer):
    violations = ProctoringViolationSerializer(source='enrollment.violations', many=True, read_only=True)
    activities = ActivityLogSerializer(many=True, read_only=True)
    screen_captures = ScreenCaptureSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source='enrollment.student.get_full_name', read_only=True)
    exam_title = serializers.CharField(source='enrollment.exam.title', read_only=True)

    class Meta:
        model = ExamSession
        fields = [
            'id', 'enrollment', 'status', 'screen_recording_path', 'video_recording_path',
            'audio_recording_path', 'camera_enabled', 'mic_enabled', 'session_start',
            'session_end', 'total_session_duration_seconds', 'total_violations',
            'total_screenshots', 'fps_average', 'connection_quality', 'ip_address',
            'device_info', 'student_name', 'exam_title',
            'violations', 'activities', 'screen_captures'
        ]
        read_only_fields = ['id', 'session_start']
