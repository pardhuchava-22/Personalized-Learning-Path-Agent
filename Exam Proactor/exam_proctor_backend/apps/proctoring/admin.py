from django.contrib import admin
from .models import ProctoringViolation, ExamSession, ActivityLog, ScreenCapture

@admin.register(ProctoringViolation)
class ProctoringViolationAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'violation_type', 'severity', 'detected_at', 'reviewed']
    list_filter = ['violation_type', 'severity', 'detected_at', 'reviewed']
    search_fields = ['enrollment__student__username', 'description']
    readonly_fields = ['detected_at']
    fieldsets = (
        ('Violation Info', {'fields': ('enrollment', 'violation_type', 'severity')}),
        ('Details', {'fields': ('description', 'evidence_screenshot', 'evidence_video_frame')}),
        ('Review', {'fields': ('reviewed', 'reviewer_notes')}),
    )

@admin.register(ExamSession)
class ExamSessionAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'status', 'session_start', 'session_end', 'total_violations']
    list_filter = ['status', 'session_start']
    search_fields = ['enrollment__student__username']
    readonly_fields = ['session_start', 'session_end']

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['session', 'activity_type', 'timestamp']
    list_filter = ['activity_type', 'timestamp']
    search_fields = ['description']
    readonly_fields = ['timestamp']

@admin.register(ScreenCapture)
class ScreenCaptureAdmin(admin.ModelAdmin):
    list_display = ['session', 'timestamp', 'reason', 'flagged']
    list_filter = ['reason', 'flagged', 'timestamp']
    readonly_fields = ['timestamp']
