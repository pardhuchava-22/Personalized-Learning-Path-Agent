from django.db import models
from django.contrib.auth import get_user_model
from exam_proctor_backend.apps.exams.models import ExamEnrollment
from exam_proctor_backend.apps.questions.models import Question, MCQOption

User = get_user_model()

class QuestionSubmission(models.Model):
    """Base submission model for questions."""
    STATUS_CHOICES = (
        ('not_attempted', 'Not Attempted'),
        ('attempted', 'Attempted'),
        ('submitted', 'Submitted'),
    )
    
    enrollment = models.ForeignKey(ExamEnrollment, on_delete=models.CASCADE, related_name='submissions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='submissions')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_attempted')
    marks_obtained = models.FloatField(default=0)
    is_correct = models.BooleanField(default=False)
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'question_submissions'
        unique_together = ('enrollment', 'question')
        indexes = [
            models.Index(fields=['enrollment', 'question']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.enrollment.student.username} - {self.question.title}"


class MCQSubmission(models.Model):
    """MCQ submission model."""
    submission = models.OneToOneField(QuestionSubmission, on_delete=models.CASCADE, related_name='mcq_submission')
    selected_option = models.ForeignKey(MCQOption, on_delete=models.SET_NULL, null=True, blank=True, related_name='submissions')
    
    class Meta:
        db_table = 'mcq_submissions'

    def __str__(self):
        return f"MCQ Submission - {self.submission.question.title}"


class CodingSubmission(models.Model):
    """Coding submission model."""
    EXECUTION_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('passed', 'Passed'),
        ('failed', 'Failed'),
        ('compilation_error', 'Compilation Error'),
        ('runtime_error', 'Runtime Error'),
        ('timeout', 'Timeout'),
    )
    
    submission = models.OneToOneField(QuestionSubmission, on_delete=models.CASCADE, related_name='coding_submission')
    
    submitted_code = models.TextField(help_text="Code submitted by student")
    execution_status = models.CharField(max_length=30, choices=EXECUTION_STATUS_CHOICES, default='pending')
    
    test_cases_passed = models.IntegerField(default=0)
    total_test_cases = models.IntegerField(default=0)
    
    execution_output = models.TextField(blank=True, help_text="Output from code execution")
    error_message = models.TextField(blank=True, help_text="Error message if any")
    
    execution_time_ms = models.FloatField(blank=True, null=True)
    memory_used_mb = models.FloatField(blank=True, null=True)
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    executed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'coding_submissions'

    def __str__(self):
        return f"Coding Submission - {self.submission.question.title}"


class CodingTestCaseResult(models.Model):
    """Result of individual test case execution."""
    STATUS_CHOICES = (
        ('passed', 'Passed'),
        ('failed', 'Failed'),
    )
    
    coding_submission = models.ForeignKey(CodingSubmission, on_delete=models.CASCADE, related_name='test_case_results')
    test_case_order = models.IntegerField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    actual_output = models.TextField(blank=True)
    expected_output = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    
    execution_time_ms = models.FloatField(blank=True, null=True)
    memory_used_mb = models.FloatField(blank=True, null=True)
    
    class Meta:
        db_table = 'coding_test_case_results'
        ordering = ['test_case_order']

    def __str__(self):
        return f"Test Case {self.test_case_order} - {self.status}"
