from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Question, MCQQuestion, CodingQuestion
from .serializers import (
    QuestionSerializer, QuestionListSerializer,
    MCQQuestionDetailSerializer, CodingQuestionDetailSerializer
)

class QuestionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # Always use full serializer to include mcq_details/coding_details
        # QuestionListSerializer omits nested options which breaks the exam UI
        return QuestionSerializer

    def get_queryset(self):
        exam_id = self.request.query_params.get('exam_id')
        if exam_id:
            return Question.objects.filter(exam_id=exam_id)
        return Question.objects.all()

    @action(detail=True, methods=['get'])
    def detail_view(self, request, pk=None):
        """Get detailed question view based on question type."""
        question = self.get_object()
        if question.question_type == 'mcq':
            mcq = question.mcq
            serializer = MCQQuestionDetailSerializer(mcq)
        elif question.question_type == 'coding':
            coding = question.coding
            serializer = CodingQuestionDetailSerializer(coding)
        else:
            serializer = QuestionSerializer(question)
        return Response(serializer.data)

class MCQQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MCQQuestion.objects.all()
    serializer_class = MCQQuestionDetailSerializer
    permission_classes = [IsAuthenticated]

class CodingQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CodingQuestion.objects.all()
    serializer_class = CodingQuestionDetailSerializer
    permission_classes = [IsAuthenticated]
