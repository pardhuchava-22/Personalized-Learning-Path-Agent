from django.contrib import admin
from .models import QuestionSubmission, MCQSubmission, CodingSubmission, CodingTestCaseResult

@admin.register(QuestionSubmission)
class QuestionSubmissionAdmin(admin.ModelAdmin):
    list_display = ['question', 'enrollment', 'status', 'marks_obtained', 'is_correct']
    list_filter = ['status', 'is_correct', 'submitted_at']
    search_fields = ['question__title', 'enrollment__student__username']
    readonly_fields = ['submitted_at', 'updated_at']

@admin.register(MCQSubmission)
class MCQSubmissionAdmin(admin.ModelAdmin):
    list_display = ['submission', 'selected_option']
    search_fields = ['submission__question__title']

@admin.register(CodingSubmission)
class CodingSubmissionAdmin(admin.ModelAdmin):
    list_display = ['submission', 'execution_status', 'test_cases_passed', 'total_test_cases']
    list_filter = ['execution_status', 'submitted_at']
    readonly_fields = ['submitted_at', 'executed_at']

@admin.register(CodingTestCaseResult)
class CodingTestCaseResultAdmin(admin.ModelAdmin):
    list_display = ['coding_submission', 'test_case_order', 'status']
    list_filter = ['status']
