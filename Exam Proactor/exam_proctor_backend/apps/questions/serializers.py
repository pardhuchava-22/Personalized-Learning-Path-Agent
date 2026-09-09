from rest_framework import serializers
from .models import Question, MCQQuestion, MCQOption, CodingQuestion, TestCase

class MCQOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MCQOption
        fields = ['id', 'option_text', 'is_correct', 'order']
        read_only_fields = ['id']

class MCQQuestionSerializer(serializers.ModelSerializer):
    options = MCQOptionSerializer(many=True, read_only=True)
    class Meta:
        model = MCQQuestion
        fields = ['id', 'options']

class MCQQuestionDetailSerializer(serializers.ModelSerializer):
    """Detailed MCQ question serializer including base question fields."""
    title = serializers.CharField(source='question.title', read_only=True)
    description = serializers.CharField(source='question.description', read_only=True)
    marks = serializers.FloatField(source='question.marks', read_only=True)
    negative_marks = serializers.FloatField(source='question.negative_marks', read_only=True)
    options = MCQOptionSerializer(many=True, read_only=True)

    class Meta:
        model = MCQQuestion
        fields = ['id', 'title', 'description', 'marks', 'negative_marks', 'options']

class TestCaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestCase
        fields = ['id', 'input_data', 'expected_output', 'is_visible', 'order']
        read_only_fields = ['id']

class CodingQuestionSerializer(serializers.ModelSerializer):
    test_cases = TestCaseSerializer(many=True, read_only=True)
    class Meta:
        model = CodingQuestion
        fields = [
            'id', 'programming_language', 'starter_code', 'time_limit_seconds',
            'memory_limit_mb', 'test_cases'
        ]

class CodingQuestionDetailSerializer(serializers.ModelSerializer):
    """Detailed coding question serializer including base question fields."""
    title = serializers.CharField(source='question.title', read_only=True)
    description = serializers.CharField(source='question.description', read_only=True)
    marks = serializers.FloatField(source='question.marks', read_only=True)
    negative_marks = serializers.FloatField(source='question.negative_marks', read_only=True)
    test_cases = TestCaseSerializer(many=True, read_only=True)

    class Meta:
        model = CodingQuestion
        fields = [
            'id', 'title', 'description', 'marks', 'negative_marks',
            'programming_language', 'starter_code', 'time_limit_seconds',
            'memory_limit_mb', 'test_cases'
        ]

class QuestionSerializer(serializers.ModelSerializer):
    mcq_details = MCQQuestionSerializer(source='mcq', read_only=True)
    coding_details = CodingQuestionSerializer(source='coding', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'exam', 'question_type', 'difficulty', 'title', 
            'description', 'marks', 'negative_marks', 'order',
            'mcq_details', 'coding_details'
        ]
        read_only_fields = ['id']

class QuestionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'question_type', 'title', 'marks', 'difficulty', 'order']
