from django.db import models
from django.contrib.auth import get_user_model
from exam_proctor_backend.apps.exams.models import Exam

User = get_user_model()

class Question(models.Model):
    """Base Question model."""
    QUESTION_TYPE_CHOICES = (
        ('mcq', 'Multiple Choice Question'),
        ('coding', 'Coding Question'),
    )
    
    DIFFICULTY_CHOICES = (
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    )
    
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    marks = models.FloatField(default=1)
    negative_marks = models.FloatField(default=0)
    
    order = models.PositiveIntegerField(default=0)
    is_mandatory = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'questions'
        ordering = ['order']
        indexes = [
            models.Index(fields=['exam', 'question_type']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_question_type_display()})"


class MCQQuestion(models.Model):
    """MCQ Question model."""
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name='mcq')
    
    class Meta:
        db_table = 'mcq_questions'

    def __str__(self):
        return self.question.title


class MCQOption(models.Model):
    """Options for MCQ questions."""
    mcq_question = models.ForeignKey(MCQQuestion, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=1000)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'mcq_options'
        ordering = ['order']

    def __str__(self):
        return self.option_text[:50]


class CodingQuestion(models.Model):
    """Coding Question model."""
    PROGRAMMING_LANGUAGE_CHOICES = (
        ('python', 'Python'),
        ('javascript', 'JavaScript'),
        ('java', 'Java'),
        ('cpp', 'C++'),
        ('csharp', 'C#'),
        ('go', 'Go'),
    )
    
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name='coding')
    
    programming_language = models.CharField(max_length=50, choices=PROGRAMMING_LANGUAGE_CHOICES)
    starter_code = models.TextField(help_text="Initial code provided to student")
    solution_code = models.TextField(help_text="Reference solution")
    
    time_limit_seconds = models.IntegerField(default=30, help_text="Time limit for code execution")
    memory_limit_mb = models.IntegerField(default=256, help_text="Memory limit in MB")
    
    class Meta:
        db_table = 'coding_questions'

    def __str__(self):
        return f"{self.question.title} ({self.programming_language})"


class TestCase(models.Model):
    """Test cases for coding questions."""
    coding_question = models.ForeignKey(CodingQuestion, on_delete=models.CASCADE, related_name='test_cases')
    
    input_data = models.TextField(help_text="Input for the test case")
    expected_output = models.TextField(help_text="Expected output")
    
    is_visible = models.BooleanField(default=True, help_text="Visible to student during exam")
    order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'test_cases'
        ordering = ['order']

    def __str__(self):
        return f"TestCase {self.order} - {self.coding_question.question.title}"
