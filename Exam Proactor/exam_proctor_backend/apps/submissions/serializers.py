from rest_framework import serializers
from exam_proctor_backend.apps.submissions.models import (
    QuestionSubmission, MCQSubmission, CodingSubmission, CodingTestCaseResult
)

class QuestionSubmissionSerializer(serializers.ModelSerializer):
    question_title = serializers.CharField(source='question.title', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)

    class Meta:
        model = QuestionSubmission
        fields = [
            'id', 'enrollment', 'question', 'question_title', 'question_type',
            'status', 'marks_obtained', 'is_correct', 'submitted_at', 'updated_at'
        ]
        read_only_fields = ['id', 'marks_obtained', 'is_correct', 'submitted_at']

class MCQSubmissionSerializer(serializers.ModelSerializer):
    submission = QuestionSubmissionSerializer(read_only=True)
    selected_option_text = serializers.CharField(source='selected_option.option_text', read_only=True)

    class Meta:
        model = MCQSubmission
        fields = ['id', 'submission', 'selected_option', 'selected_option_text']

class CodingTestCaseResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodingTestCaseResult
        fields = [
            'id', 'test_case_order', 'status', 'actual_output',
            'expected_output', 'error_message', 'execution_time_ms', 'memory_used_mb'
        ]
        read_only_fields = ['id']

class CodingSubmissionSerializer(serializers.ModelSerializer):
    submission = QuestionSubmissionSerializer(read_only=True)
    test_case_results = CodingTestCaseResultSerializer(many=True, read_only=True)

    class Meta:
        model = CodingSubmission
        fields = [
            'id', 'submission', 'submitted_code', 'execution_status',
            'test_cases_passed', 'total_test_cases', 'execution_output',
            'error_message', 'execution_time_ms', 'memory_used_mb',
            'submitted_at', 'executed_at', 'test_case_results'
        ]
        read_only_fields = [
            'id', 'execution_status', 'test_cases_passed', 'execution_output',
            'error_message', 'execution_time_ms', 'memory_used_mb', 'executed_at'
        ]
