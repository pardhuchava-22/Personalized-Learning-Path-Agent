from django.contrib import admin
from .models import Exam, ExamEnrollment, Course, CourseEnrollment


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'category', 'difficulty', 'total_lessons', 'is_published']
    list_filter = ['category', 'difficulty', 'is_published']
    search_fields = ['title', 'description']


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'completed_lessons', 'enrolled_at']
    list_filter = ['enrolled_at']
    search_fields = ['student__username', 'course__title']


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'start_time', 'end_time', 'status', 'total_marks']
    list_filter = ['status', 'created_at', 'instructor']
    search_fields = ['title', 'description']
    fieldsets = (
        ('Basic Info', {'fields': ('title', 'description', 'course_name', 'course', 'instructor')}),
        ('Timing', {'fields': ('start_time', 'end_time', 'duration_minutes')}),
        ('Settings', {'fields': ('status', 'total_marks', 'passing_marks', 'negative_marking')}),
        ('Proctoring', {'fields': ('enable_camera', 'enable_mic', 'enable_screenshot', 'record_screen', 'record_video', 'fullscreen_required', 'tab_switch_allowed')}),
        ('Violation', {'fields': ('violation_threshold', 'score_reduction_per_violation')}),
        ('Question Settings', {'fields': ('shuffle_questions', 'shuffle_options', 'allow_multiple_attempts', 'show_answers_after_exam')}),
    )


@admin.register(ExamEnrollment)
class ExamEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'exam', 'status', 'score', 'result', 'enrolled_at']
    list_filter = ['status', 'result', 'enrolled_at']
    search_fields = ['student__username', 'exam__title']
    readonly_fields = ['enrolled_at', 'started_at', 'submitted_at']
