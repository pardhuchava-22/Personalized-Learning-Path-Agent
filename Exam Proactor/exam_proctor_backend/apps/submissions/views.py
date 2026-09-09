from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import (
    QuestionSubmission, MCQSubmission, CodingSubmission, CodingTestCaseResult
)
from .serializers import (
    QuestionSubmissionSerializer, MCQSubmissionSerializer, CodingSubmissionSerializer
)

class QuestionSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuestionSubmission.objects.filter(enrollment__student=self.request.user)

    def perform_create(self, serializer):
        serializer.save()

class MCQSubmissionViewSet(viewsets.ModelViewSet):
    queryset = MCQSubmission.objects.all()
    serializer_class = MCQSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MCQSubmission.objects.filter(submission__enrollment__student=self.request.user)

    @action(detail=False, methods=['post'])
    def submit_answer(self, request):
        """Submit MCQ answer."""
        enrollment_id = request.data.get('enrollment_id')
        question_id = request.data.get('question_id')
        option_id = request.data.get('option_id')

        try:
            submission, created = QuestionSubmission.objects.get_or_create(
                enrollment_id=enrollment_id,
                question_id=question_id
            )
            submission.status = 'submitted'
            submission.save()

            mcq_submission, _ = MCQSubmission.objects.get_or_create(
                submission=submission
            )
            if option_id:
                mcq_submission.selected_option_id = option_id
                mcq_submission.save()

            serializer = MCQSubmissionSerializer(mcq_submission)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class CodingSubmissionViewSet(viewsets.ModelViewSet):
    queryset = CodingSubmission.objects.all()
    serializer_class = CodingSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CodingSubmission.objects.filter(submission__enrollment__student=self.request.user)

    @action(detail=False, methods=['post'])
    def execute_code(self, request):
        """Execute coding solution against test cases."""
        from .executor import run_code
        
        language = request.data.get('language')
        code = request.data.get('code')
        test_cases = request.data.get('test_cases', [])
        
        try:
            results = run_code(language, code, test_cases)
            return Response({'results': results}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def submit_code(self, request):
        """Submit coding solution."""
        enrollment_id = request.data.get('enrollment_id')
        question_id = request.data.get('question_id')
        code = request.data.get('code')

        try:
            submission, created = QuestionSubmission.objects.get_or_create(
                enrollment_id=enrollment_id,
                question_id=question_id
            )
            submission.status = 'submitted'
            submission.save()

            coding_submission, _ = CodingSubmission.objects.get_or_create(
                submission=submission
            )
            coding_submission.submitted_code = code
            coding_submission.execution_status = 'pending'
            coding_submission.save()

            serializer = CodingSubmissionSerializer(coding_submission)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
