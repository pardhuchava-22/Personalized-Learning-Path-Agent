from django.contrib import admin
from .models import Question, MCQQuestion, MCQOption, CodingQuestion, TestCase

class MCQOptionInline(admin.TabularInline):
    model = MCQOption
    extra = 1

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['title', 'exam', 'question_type', 'difficulty', 'marks', 'order']
    list_filter = ['question_type', 'difficulty', 'exam']
    search_fields = ['title', 'description']

@admin.register(MCQQuestion)
class MCQQuestionAdmin(admin.ModelAdmin):
    inlines = [MCQOptionInline]
    list_display = ['question', 'get_exam']
    
    def get_exam(self, obj):
        return obj.question.exam
    get_exam.short_description = 'Exam'

@admin.register(CodingQuestion)
class CodingQuestionAdmin(admin.ModelAdmin):
    list_display = ['question', 'programming_language', 'time_limit_seconds', 'memory_limit_mb']
    list_filter = ['programming_language']

@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ['coding_question', 'order', 'is_visible']
    list_filter = ['is_visible']
