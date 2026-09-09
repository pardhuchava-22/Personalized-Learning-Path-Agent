from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Avg, Count, Max, Min, Q
from django.db import transaction
from django.shortcuts import get_object_or_404
from datetime import timedelta
import uuid
import json
import google.generativeai as genai
from .services import FLASH_MODEL

from .models import (
    Exam, ExamEnrollment, Course, CourseEnrollment,
    CourseGenerationTask, CourseGenerationStep, Module, Quiz, QuizQuestion,
    CodingChallenge, VideoTimestamp, VideoProgress, QuizAttempt, ChallengeSubmission,
    RevisionSession, FinalExam, Note, VideoTranscript, CourseProgress, CodeRemediationItem
)
from .serializers import (
    ExamSerializer, ExamListSerializer, ExamEnrollmentSerializer,
    CourseSerializer, CourseEnrollmentSerializer
)
from exam_proctor_backend.apps.proctoring.models import ExamSession, ProctoringViolation
from exam_proctor_backend.apps.proctoring.serializers import ExamSessionSerializer, ProctoringViolationSerializer
from exam_proctor_backend.apps.submissions.models import QuestionSubmission, MCQSubmission, CodingSubmission
from exam_proctor_backend.apps.questions.models import Question, MCQQuestion, MCQOption, CodingQuestion, TestCase


class CourseViewSet(viewsets.ModelViewSet):
    """CRUD for courses. Instructors manage, students browse."""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'instructor' or user.role == 'admin':
            return Course.objects.filter(instructor=user)
        return Course.objects.filter(is_published=True)

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    def destroy(self, request, *args, **kwargs):
        user = self.request.user
        try:
            # Bypass get_queryset filters to find the course globally first
            course = Course.objects.get(pk=kwargs['pk'])
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)

        if user.role in ['instructor', 'admin']:
            # Instructors can only delete their own courses (Admins can delete any)
            if course.instructor != user and user.role != 'admin':
                return Response({'error': 'You do not have permission to delete this course.'}, status=status.HTTP_403_FORBIDDEN)
            course.delete()
            return Response({'message': 'Course deleted successfully'}, status=status.HTTP_200_OK)
        else:
            # Students: Delete their enrollment (unenroll) rather than deleting the course!
            enrollment = CourseEnrollment.objects.filter(student=user, course=course).first()
            if enrollment:
                enrollment.delete()
                return Response({'message': 'Unenrolled from course successfully'}, status=status.HTTP_200_OK)
            return Response({'error': 'You are not enrolled in this course.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        """Enroll current student in a course."""
        course = self.get_object()
        enrollment, created = CourseEnrollment.objects.get_or_create(
            student=request.user, course=course
        )
        serializer = CourseEnrollmentSerializer(enrollment)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_courses(self, request):
        """Get courses the current user is enrolled in (with progress)."""
        enrollments = CourseEnrollment.objects.filter(
            student=request.user
        ).select_related('course', 'course__instructor')
        # Custom serializing matching frontend exact expectation
        rows = []
        for e in enrollments:
            c = e.course
            modules = c.modules.all()
            quizzes_total = sum(m.quizzes.count() for m in modules)
            challenge_total = sum(m.coding_challenges.count() for m in modules)
            revision_total = sum(m.revision_sessions.count() for m in modules)
            youtube_url = ""
            if c.youtube_video_id:
                youtube_url = f"https://www.youtube.com/watch?v={c.youtube_video_id}"
            elif c.youtube_playlist_id:
                youtube_url = f"https://www.youtube.com/playlist?list={c.youtube_playlist_id}"

            # Format duration
            hours, remainder = divmod(c.total_duration_seconds or 0, 3600)
            minutes, secs = divmod(remainder, 60)
            video_duration_str = f"{hours:02d}:{minutes:02d}:{secs:02d}"

            # Calculate completed counts dynamically
            quiz_ids = Quiz.objects.filter(module__in=modules).values_list('id', flat=True)
            quizzes_completed = QuizAttempt.objects.filter(student=request.user, quiz_id__in=quiz_ids, is_passed=True).values('quiz').distinct().count()
            
            challenge_ids = CodingChallenge.objects.filter(module__in=modules).values_list('id', flat=True)
            challenge_completed = ChallengeSubmission.objects.filter(student=request.user, challenge_id__in=challenge_ids, is_passed=True).values('challenge').distinct().count()
            
            revision_ids = RevisionSession.objects.filter(module__in=modules).values_list('id', flat=True)
            revision_completed = RevisionSession.objects.filter(id__in=revision_ids, is_completed=True).count()

            # Dynamic progress recalculation based on actual DB status
            progress_pct = 0
            enroll_status = "not_started"
            progress_record = CourseProgress.objects.filter(enrollment=e).first()
            if progress_record:
                # Synchronize course progress percentage
                total_possible = len(modules) + quizzes_total + challenge_total + revision_total
                total_done = e.completed_lessons + quizzes_completed + challenge_completed + revision_completed
                progress_pct = min(100, round((total_done / total_possible) * 100)) if total_possible > 0 else 0
                
                # Update DB cache
                progress_record.progress_percentage = progress_pct
                progress_record.status = "completed" if progress_pct == 100 else "in_progress" if progress_pct > 0 else "not_started"
                progress_record.save()
                enroll_status = progress_record.status

            rows.append({
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "thumbnail": c.thumbnail or f"https://i.ytimg.com/vi/{c.youtube_video_id}/hqdefault.jpg" if c.youtube_video_id else "https://picsum.photos/seed/playlist/200/120",
                "difficulty": c.difficulty,
                "category": c.category,
                "youtube_url": youtube_url,
                "video_duration": video_duration_str,
                "start_date": c.start_date.isoformat() if c.start_date else (c.created_at.strftime("%Y-%m-%d") if c.created_at else ""),
                "daily_learning_time_minutes": c.daily_learning_time_minutes or 0,
                "language": c.language or "English",
                "progress": progress_pct,
                "completed_lessons": e.completed_lessons,
                "total_lessons": modules.count() or c.total_lessons,
                "status": enroll_status,
                "modules": {"completed": e.completed_lessons, "total": modules.count() or c.total_lessons},
                "quizzes": {"completed": quizzes_completed, "total": quizzes_total},
                "coding_challenges": {"completed": challenge_completed, "total": challenge_total},
                "revisions": {"completed": revision_completed, "total": revision_total}
            })
        return Response(rows)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # Custom serializing matching frontend exact expectation
        rows = []
        for c in queryset:
            youtube_url = ""
            if c.youtube_video_id:
                youtube_url = f"https://www.youtube.com/watch?v={c.youtube_video_id}"
            elif c.youtube_playlist_id:
                youtube_url = f"https://www.youtube.com/playlist?list={c.youtube_playlist_id}"

            # Format duration
            hours, remainder = divmod(c.total_duration_seconds or 0, 3600)
            minutes, secs = divmod(remainder, 60)
            video_duration_str = f"{hours:02d}:{minutes:02d}:{secs:02d}"

            enrollment = CourseEnrollment.objects.filter(course=c, student=request.user).first()
            progress_pct = 0
            enroll_status = "not_started"
            if enrollment:
                progress_record = CourseProgress.objects.filter(enrollment=enrollment).first()
                if progress_record:
                    progress_pct = progress_record.progress_percentage
                    enroll_status = progress_record.status

            rows.append({
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "thumbnail": c.thumbnail or (f"https://i.ytimg.com/vi/{c.youtube_video_id}/hqdefault.jpg" if c.youtube_video_id else "https://picsum.photos/seed/playlist/200/120"),
                "difficulty": c.difficulty,
                "category": c.category,
                "total_lessons": c.modules.count() or c.total_lessons,
                "is_published": c.is_published,
                "created_at": c.created_at,
                "instructor_id": c.instructor.id,
                "start_date": c.start_date.isoformat() if c.start_date else "",
                "video_duration": video_duration_str,
                "daily_learning_time_minutes": c.daily_learning_time_minutes or 0,
                "language": c.language or "English",
                "progress": progress_pct,
                "status": enroll_status,
            })
        return Response(rows)

    def retrieve(self, request, pk=None, *args, **kwargs):
        c = self.get_object()
        youtube_url = ""
        if c.youtube_video_id:
            youtube_url = f"https://www.youtube.com/watch?v={c.youtube_video_id}"
        elif c.youtube_playlist_id:
            youtube_url = f"https://www.youtube.com/playlist?list={c.youtube_playlist_id}"

        enrollment = CourseEnrollment.objects.filter(course=c, student=request.user).first()
        
        modules_data = []
        sorted_modules = c.modules.all().order_by('order')
        
        for m in sorted_modules:
            quizzes_data = []
            for q in m.quizzes.all():
                questions_data = []
                for quest in q.questions.all():
                    try:
                        options = json.loads(quest.options_json)
                    except Exception:
                        options = []
                    questions_data.append({
                        "id": quest.id,
                        "question_text": quest.question_text,
                        "options": options,
                        "correct_option_index": quest.correct_option_index
                    })
                quizzes_data.append({
                    "id": q.id,
                    "title": q.title,
                    "passing_score": q.passing_score,
                    "questions": questions_data
                })
                
            challenges_data = []
            for cc in m.coding_challenges.all():
                try:
                    test_cases = json.loads(cc.test_cases_json)
                except Exception:
                    test_cases = []
                challenges_data.append({
                    "id": cc.id,
                    "title": cc.title,
                    "instructions": cc.instructions,
                    "starter_code": cc.starter_code,
                    "solution_code": cc.solution_code,
                    "programming_language": cc.programming_language,
                    "test_cases": test_cases
                })

            # Format module duration
            mod_mins = m.estimated_minutes or 60
            hours, remainder = divmod(m.watch_start_seconds or 0, 3600)
            minutes, secs = divmod(remainder, 60)
            watch_start_str = f"{minutes:02d}:{secs:02d}" if not hours else f"{hours:02d}:{minutes:02d}:{secs:02d}"

            hours, remainder = divmod(m.watch_end_seconds or 0, 3600)
            minutes, secs = divmod(remainder, 60)
            watch_end_str = f"{minutes:02d}:{secs:02d}" if not hours else f"{hours:02d}:{minutes:02d}:{secs:02d}"

            timestamps_data = []
            for ts in m.timestamps.all().order_by('timestamp_seconds'):
                hours, remainder = divmod(ts.timestamp_seconds, 3600)
                minutes, secs = divmod(remainder, 60)
                ts_time_str = f"{minutes:02d}:{secs:02d}" if not hours else f"{hours:02d}:{minutes:02d}:{secs:02d}"
                timestamps_data.append({
                    "id": ts.id,
                    "seconds": ts.timestamp_seconds,
                    "time": ts_time_str,
                    "label": ts.label
                })
                
            progress_obj = VideoProgress.objects.filter(student=request.user, module=m).first()
            progress_data = {
                "watch_time_seconds": progress_obj.watch_time_seconds if progress_obj else 0,
                "is_completed": progress_obj.is_completed if progress_obj else False
            }
                
            modules_data.append({
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "estimated_minutes": mod_mins,
                "video_url": m.video_url,
                "order": m.order,
                "learning_day": m.learning_day or m.order,
                "scheduled_date": m.scheduled_date.isoformat() if m.scheduled_date else "",
                "scheduled_time": m.scheduled_time or "",
                "watch_start_seconds": m.watch_start_seconds or 0,
                "watch_end_seconds": m.watch_end_seconds or 0,
                "watch_start": watch_start_str,
                "watch_end": watch_end_str,
                "source_video_id": m.source_video_id,
                "timestamps": timestamps_data,
                "quizzes": quizzes_data,
                "coding_challenges": challenges_data,
                "progress": progress_data
            })

        # Format full duration
        hours, remainder = divmod(c.total_duration_seconds or 0, 3600)
        minutes, secs = divmod(remainder, 60)
        video_duration_str = f"{hours:02d}:{minutes:02d}:{secs:02d}"

        try:
            advanced_options = json.loads(c.advanced_options_json or "{}")
        except Exception:
            advanced_options = {}
            
        progress_pct = 0
        enroll_status = "not_started"
        if enrollment:
            progress_record = CourseProgress.objects.filter(enrollment=enrollment).first()
            if progress_record:
                progress_pct = progress_record.progress_percentage
                enroll_status = progress_record.status

        thumbnail = c.thumbnail or f"https://i.ytimg.com/vi/{c.youtube_video_id}/hqdefault.jpg" if c.youtube_video_id else "https://picsum.photos/seed/playlist/200/120"
        if "picsum.photos" in thumbnail and c.youtube_video_id:
            thumbnail = f"https://i.ytimg.com/vi/{c.youtube_video_id}/hqdefault.jpg"

        return Response({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "thumbnail": thumbnail,
            "difficulty": c.difficulty,
            "category": c.category,
            "youtube_url": youtube_url,
            "total_lessons": sorted_modules.count() or c.total_lessons,
            "video_duration": video_duration_str,
            "total_duration_seconds": c.total_duration_seconds or 0,
            "start_date": c.start_date.isoformat() if c.start_date else "",
            "daily_learning_time_minutes": c.daily_learning_time_minutes or 0,
            "learning_goal": c.learning_goal or "",
            "advanced_options": advanced_options,
            "language": c.language or "English",
            "channel_name": c.channel_name or "",
            "video_count": c.video_count or 1,
            "progress": progress_pct,
            "status": enroll_status,
            "modules": modules_data
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate(self, request):
        data = request.data
        url = data.get("youtube_url") or data.get("youtubeUrl") or ""
        if not url:
            return Response({"error": "Please enter YouTube URL"}, status=status.HTTP_400_BAD_REQUEST)

        daily_learning_time = data.get("daily_learning_time") or data.get("dailyTime") or "2 Hours"
        start_date_str = data.get("start_date") or data.get("startDate") or timezone.now().date().isoformat()
        goals = data.get("goals") or data.get("learningGoal") or ""

        # Normalize start date
        try:
            from datetime import date
            parsed_start_date = date.fromisoformat(start_date_str[:10])
        except ValueError:
            parsed_start_date = timezone.now().date()

        # Extract YouTube IDs using services helpers
        from .services import extract_youtube_id, extract_playlist_id, parse_learning_minutes, normalize_include_options, has_complete_generated_content
        video_id = extract_youtube_id(url)
        playlist_id = extract_playlist_id(url)
        if not video_id and not playlist_id:
            return Response({"error": "Invalid YouTube video or playlist link"}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing duplicate
        existing = None
        if playlist_id:
            existing = Course.objects.filter(instructor=request.user, youtube_playlist_id=playlist_id).first()
        elif video_id:
            existing = Course.objects.filter(instructor=request.user, youtube_video_id=video_id).first()

        if existing and has_complete_generated_content(existing):
            return Response({
                "task_id": None,
                "course_id": existing.id,
                "status": "completed",
                "duplicate": True,
                "message": "Course already exists. Resume existing?"
            })

        if existing:
            existing.delete()

        task_id = str(uuid.uuid4())
        task = CourseGenerationTask.objects.create(
            id=task_id,
            user=request.user,
            youtube_url=url,
            status="pending",
            progress=0,
            current_step="Initializing",
            request_payload_json=json.dumps(data),
            daily_learning_time_minutes=parse_learning_minutes(daily_learning_time),
            start_date=parsed_start_date,
            goals=goals,
            advanced_options_json=json.dumps(data.get("advanced_options", {}))
        )

        return Response({
            "task_id": task_id,
            "course_id": None,
            "status": "pending",
            "message": "Generation enqueued successfully"
        })

    @action(detail=False, methods=['get'], url_path=r'generation-status/(?P<task_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def check_generation_status(self, request, task_id=None):
        task = get_object_or_404(CourseGenerationTask, id=task_id)
        return Response({
            "task_id": task.id,
            "status": task.status,
            "progress": task.progress,
            "current_step": task.current_step,
            "course_id": task.course_id
        })

    @action(detail=False, methods=['post'], url_path=r'generate/retry/(?P<task_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def retry_generation(self, request, task_id=None):
        task = get_object_or_404(CourseGenerationTask, id=task_id, user=request.user)
        task.status = "pending"
        task.progress = 10
        task.current_step = "Retrying failed task step..."
        task.save()

        # Reset failed steps
        CourseGenerationStep.objects.filter(task=task, status="failed").update(status="pending")
        return Response({"detail": "Task retry enqueued"})

    @action(detail=False, methods=['get'], url_path='pending-tasks', permission_classes=[IsAuthenticated])
    def get_pending_tasks(self, request):
        task = CourseGenerationTask.objects.filter(
            user=request.user,
            status__in=["pending", "processing"]
        ).order_by('-created_at').first()

        if task:
            return Response({
                "task_id": task.id,
                "status": task.status,
                "progress": task.progress,
                "current_step": task.current_step
            })
        return Response({"task_id": None})

    @action(detail=True, methods=['get'], url_path='verify', permission_classes=[IsAuthenticated])
    def verify_course(self, request, pk=None):
        course = self.get_object()
        from .services import has_complete_generated_content
        verified = has_complete_generated_content(course)
        return Response({
            "verified": verified,
            "reason": "OK" if verified else "Course has incomplete generated components"
        })

    @action(detail=True, methods=['get'], url_path='resume', permission_classes=[IsAuthenticated])
    def resume(self, request, pk=None):
        course = self.get_object()
        sorted_modules = course.modules.all().order_by('order')
        if not sorted_modules.exists():
            return Response({"route": f"/course/{course.id}", "reason": "no_modules"})

        for m in sorted_modules:
            progress = VideoProgress.objects.filter(student=request.user, module=m).first()
            video_completed = progress.is_completed if progress else False
            watch_time = progress.watch_time_seconds if progress else 0

            if not video_completed:
                return Response({
                    "route": f"/course/{course.id}/learn?module_id={m.id}",
                    "module_id": m.id,
                    "module_title": m.title,
                    "module_order": m.order,
                    "watch_time_seconds": watch_time,
                    "reason": "video_incomplete"
                })

            quiz = m.quizzes.first()
            if quiz:
                passed_attempt = QuizAttempt.objects.filter(
                    student=request.user, quiz=quiz, is_passed=True
                ).exists()
                if not passed_attempt:
                    return Response({
                        "route": f"/quiz?course_id={course.id}&module_id={m.id}",
                        "module_id": m.id,
                        "module_title": m.title,
                        "module_order": m.order,
                        "reason": "quiz_pending"
                    })

            challenge = m.coding_challenges.first()
            if challenge:
                passed_submission = ChallengeSubmission.objects.filter(
                    student=request.user, challenge=challenge, is_passed=True
                ).exists()
                if not passed_submission:
                    return Response({
                        "route": f"/lab?course_id={course.id}&module_id={m.id}",
                        "module_id": m.id,
                        "module_title": m.title,
                        "module_order": m.order,
                        "reason": "challenge_pending"
                    })

        return Response({
            "route": f"/course/{course.id}",
            "reason": "all_completed",
            "progress": 100
        })


class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ExamListSerializer
        return ExamSerializer

    def get_queryset(self):
        user = self.request.user

        if user.role == 'admin':
            queryset = Exam.objects.all()
        elif user.role == 'instructor':
            queryset = Exam.objects.filter(instructor=user)
            if not queryset.exists() and Exam.objects.exists():
                queryset = Exam.objects.all()
        else:
            status_param = self.request.query_params.get('status')
            if status_param:
                queryset = Exam.objects.filter(status=status_param)
            else:
                queryset = Exam.objects.filter(status__in=['published', 'active'])

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        """Enroll student in exam."""
        exam = self.get_object()
        try:
            existing = ExamEnrollment.objects.get(exam=exam, student=request.user)
            if existing.status in ['submitted', 'completed']:
                return Response(
                    {'error': 'You have already completed this exam.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            serializer = ExamEnrollmentSerializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ExamEnrollment.DoesNotExist:
            enrollment = ExamEnrollment.objects.create(exam=exam, student=request.user)
            serializer = ExamEnrollmentSerializer(enrollment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def start(self, request, pk=None):
        """Start exam."""
        exam = self.get_object()
        try:
            enrollment = ExamEnrollment.objects.get(exam=exam, student=request.user)
            if enrollment.status in ['submitted', 'completed']:
                return Response(
                    {'error': 'You have already submitted this exam.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            enrollment.status = 'started'
            enrollment.started_at = timezone.now()
            enrollment.save()
            return Response({'message': 'Exam started', 'enrollment': ExamEnrollmentSerializer(enrollment).data})
        except ExamEnrollment.DoesNotExist:
            return Response({'error': 'You are not enrolled in this exam.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def check_status(self, request, pk=None):
        """Check current student's enrollment status (is_blocked, status, etc.)."""
        exam = self.get_object()
        try:
            enrollment = ExamEnrollment.objects.get(exam=exam, student=request.user)
            serializer = ExamEnrollmentSerializer(enrollment)
            return Response(serializer.data)
        except ExamEnrollment.DoesNotExist:
            return Response({'error': 'Not enrolled'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'error': 'Not enrolled in this exam'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit(self, request, pk=None):
        """Finalize and submit exam with all answers and auto-grading."""
        exam = self.get_object()
        user = request.user
        data = request.data
        
        answers = data.get('answers', {})
        time_taken_seconds = data.get('time_taken_seconds', 0)
        is_auto_submit = data.get('is_auto_submit', False)
        
        try:
            with transaction.atomic():
                enrollment = ExamEnrollment.objects.select_for_update().get(exam=exam, student=user)
                
                # Graceful handling of already submitted exams
                if enrollment.status in ['completed', 'submitted']:
                    if not exam.allow_multiple_attempts:
                        # Return existing result instead of 400 error to avoid frontend confusion
                        return Response({
                            'message': 'Exam already completed',
                            'is_already_submitted': True,
                            'result': {
                                'examTitle': exam.title,
                                'score': round(enrollment.percentage, 2),
                                'status': enrollment.status,
                                'result': enrollment.result,
                            }
                        })

                if enrollment.is_blocked:
                    return Response({'error': 'You have been blocked from this exam by the admin.'}, status=status.HTTP_403_FORBIDDEN)

                # 1. Process all answers and calculate score
                total_earned_marks = 0
                correct_count = 0
                questions = Question.objects.filter(exam=exam)
                
                for question in questions:
                    user_answer = answers.get(str(question.id))
                    
                    # Create or update QuestionSubmission
                    submission, _ = QuestionSubmission.objects.get_or_create(
                        enrollment=enrollment,
                        question=question
                    )
                    submission.status = 'submitted'
                    
                    is_correct = False
                    marks_obtained = 0
                    
                    if question.question_type == 'mcq':
                        # Get correct option for this question
                        mcq_question = getattr(question, 'mcq', None)
                        if mcq_question:
                            mcq_submission, _ = MCQSubmission.objects.get_or_create(submission=submission)
                            if user_answer:
                                try:
                                    # Handle both string and int option IDs
                                    option_id = int(str(user_answer))
                                    selected_option = MCQOption.objects.get(id=option_id, mcq_question=mcq_question)
                                    mcq_submission.selected_option = selected_option
                                    mcq_submission.save()
                                    
                                    if selected_option.is_correct:
                                        is_correct = True
                                        marks_obtained = question.marks
                                        correct_count += 1
                                    else:
                                        # Apply negative marking if any
                                        marks_obtained = -exam.negative_marking
                                except (MCQOption.DoesNotExist, ValueError, TypeError):
                                    pass
                    
                    elif question.question_type == 'coding':
                        coding_submission, _ = CodingSubmission.objects.get_or_create(submission=submission)
                        if user_answer:
                            coding_submission.submitted_code = str(user_answer)
                            coding_submission.save()
                        
                    submission.is_correct = is_correct
                    submission.marks_obtained = marks_obtained
                    submission.save()
                    
                    total_earned_marks += marks_obtained

                # 2. Apply Violation Reductions
                violations = enrollment.violations.all()
                violation_count = violations.count()
                
                score_reduction_pct = 0
                if violation_count >= exam.violation_threshold and exam.violation_threshold > 0:
                    score_reduction_pct = (violation_count / exam.violation_threshold) * exam.score_reduction_per_violation
                
                final_score = total_earned_marks - (exam.total_marks * (score_reduction_pct / 100))
                final_percentage = (final_score / exam.total_marks) * 100 if exam.total_marks > 0 else 0
                
                # --- Advanced Integrity Scoring (Weighted by Severity) ---
                high_impact = violations.filter(severity='high').count() * 20
                med_impact = violations.filter(severity='medium').count() * 10
                low_impact = violations.filter(severity='low').count() * 5
                integrity_score = max(0, 100 - (high_impact + med_impact + low_impact))

                
                # 3. Update Enrollment
                enrollment.status = 'completed'
                enrollment.submitted_at = timezone.now()
                enrollment.time_taken_seconds = time_taken_seconds
                enrollment.score = max(0, final_score)
                enrollment.percentage = max(0, final_percentage)
                enrollment.result = 'pass' if final_percentage >= exam.passing_marks else 'fail'
                enrollment.total_violations = violation_count
                enrollment.final_violations = violation_count
                enrollment.score_reduction = score_reduction_pct
                enrollment.integrity_score = integrity_score
                enrollment.is_auto_submitted = is_auto_submit
                enrollment.save()
                
                # 4. End Session if exists
                try:
                    from exam_proctor_backend.apps.proctoring.models import ExamSession
                    session = ExamSession.objects.filter(enrollment=enrollment).first()
                    if session:
                        session.status = 'ended'
                        session.session_end = enrollment.submitted_at
                        session.save()
                except Exception:
                    pass

                # Gather violation evidence
                violation_data = []
                for v in violations[:10]:
                    violation_data.append({
                        'id': v.id,
                        'type': v.violation_type,
                        'title': v.get_violation_type_display(),
                        'severity': v.severity,
                        'detected_at': v.detected_at,
                        'description': v.description,
                        'screenshot': v.evidence_screenshot.url if v.evidence_screenshot else None,
                        'path': v.evidence_screenshot.name if v.evidence_screenshot else None
                    })

                questions_review = []
                for q in questions:
                    qs_record = QuestionSubmission.objects.filter(enrollment=enrollment, question=q).first()
                    q_data = {
                        'id': str(q.id),
                        'text': q.description or q.title or '',
                        'type': q.question_type,
                        'userAnswerId': None,
                        'correctAnswerId': None,
                        'options': [],
                        'explanation': 'Exam question'
                    }

                    if q.question_type == 'mcq':
                        mcq_q = getattr(q, 'mcq', None)
                        if mcq_q:
                            for opt in mcq_q.options.all().order_by('order'):
                                option_id = str(opt.id)
                                q_data['options'].append({
                                    'id': option_id,
                                    'text': opt.option_text,
                                    'isCorrect': opt.is_correct
                                })
                                if opt.is_correct:
                                    q_data['correctAnswerId'] = option_id

                            if qs_record:
                                mcq_sub = getattr(qs_record, 'mcq_submission', None)
                                if mcq_sub and mcq_sub.selected_option:
                                    q_data['userAnswerId'] = str(mcq_sub.selected_option.id)
                    elif q.question_type == 'coding' and qs_record:
                        coding_sub = getattr(qs_record, 'coding_submission', None)
                        if coding_sub:
                            q_data['userAnswerId'] = coding_sub.submitted_code

                    questions_review.append(q_data)

                return Response({
                    'message': 'Exam completed successfully',
                    'result': {
                        'examTitle': exam.title,
                        'score': round(enrollment.percentage, 2),
                        'totalQuestions': questions.count(),
                        'correctAnswers': correct_count,
                        'timeSpent': f"{time_taken_seconds // 60}m {time_taken_seconds % 60}s",
                        'status': enrollment.status,
                        'result': enrollment.result,
                        'integrity_score': enrollment.integrity_score,
                        'violations': violation_data,
                        'questions': questions_review,
                        'is_auto_submitted': enrollment.is_auto_submitted
                    }
                })
        except ExamEnrollment.DoesNotExist:
            return Response({'error': 'Not enrolled in this exam'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_exams(self, request):
        """Get exams for current user."""
        if request.user.role in ['instructor', 'admin']:
            if request.user.role == 'admin':
                exams = Exam.objects.all().order_by('-created_at')
            else:
                exams = Exam.objects.filter(instructor=request.user).order_by('-created_at')
                if not exams.exists() and Exam.objects.exists():
                    exams = Exam.objects.all().order_by('-created_at')
        else:
            # For students: 
            # 1. Any exam they are enrolled in (including past ones)
            # 2. Any published/active exam that hasn't ended yet (available for enrollment)
            now = timezone.now()
            exams = Exam.objects.filter(
                Q(enrollments__student=request.user) | 
                Q(status__in=['published', 'active'], end_time__gt=now)
            ).distinct()
        serializer = ExamListSerializer(exams, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard_stats(self, request):
        """Dashboard statistics for exams."""
        user = request.user
        now = timezone.now()

        if user.role in ['instructor', 'admin']:
            exams = Exam.objects.filter(instructor=user)
            if not exams.exists() and Exam.objects.exists():
                exams = Exam.objects.all()

            active_exams = exams.filter(start_time__lte=now, end_time__gte=now).count()
            total_students = ExamEnrollment.objects.filter(exam__in=exams).values('student').distinct().count()
            pending_reviews = ExamEnrollment.objects.filter(
                exam__in=exams, status='submitted'
            ).count()
            avg_score = ExamEnrollment.objects.filter(
                exam__in=exams, percentage__isnull=False
            ).aggregate(avg=Avg('percentage'))['avg'] or 0

            upcoming_exams = exams.filter(start_time__gt=now).order_by('start_time')[:5]
            recent_submissions = ExamEnrollment.objects.filter(
                exam__in=exams
            ).exclude(status='enrolled').select_related('student', 'exam').order_by('-submitted_at')[:10]

            # Class Performance Trend & Submission Density (Last 15 days)
            performance_trend = []
            submission_density = []
            for i in range(14, -1, -1):
                date = (now - timedelta(days=i)).date()
                day_qs = ExamEnrollment.objects.filter(
                    exam__in=exams,
                    submitted_at__date=date,
                    status__in=['submitted', 'completed']
                )
                day_avg = day_qs.aggregate(avg=Avg('percentage'))['avg'] or 0
                performance_trend.append(round(day_avg, 1))
                submission_density.append(day_qs.count())

            return Response({
                'active_exams': active_exams,
                'total_students': total_students,
                'pending_reviews': pending_reviews,
                'class_average': round(avg_score, 1),
                'total_exams': exams.count(),
                'performance_trend': performance_trend,
                'submission_density': submission_density,
                'upcoming_exams': ExamListSerializer(upcoming_exams, many=True, context={'request': request}).data,
                'recent_submissions': ExamEnrollmentSerializer(recent_submissions, many=True).data,
            })
        else:
            enrollments = ExamEnrollment.objects.filter(student=user)
            upcoming = Exam.objects.filter(
                status__in=['published', 'active'],
                start_time__gt=now
            ).order_by('start_time')[:5]
            avg_score = enrollments.filter(percentage__isnull=False).aggregate(avg=Avg('percentage'))['avg'] or 0

            return Response({
                'enrolled_exams': enrollments.count(),
                'completed_exams': enrollments.filter(status__in=['submitted', 'completed']).count(),
                'average_score': round(avg_score, 1),
                'upcoming_exams': ExamListSerializer(upcoming, many=True, context={'request': request}).data,
            })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def student_detailed_analytics(self, request):
        """Detailed examination-centric analytics for the student."""
        user = request.user
        enrollments = ExamEnrollment.objects.filter(student=user, status__in=['submitted', 'completed']).order_by('submitted_at')
        submissions = QuestionSubmission.objects.filter(enrollment__student=user)
        
        # 1. KPI Calculations
        total_tests = enrollments.count()
        total_questions = submissions.count()
        avg_score = enrollments.aggregate(avg=Avg('percentage'))['avg'] or 0
        
        # Calculate Speed (Average seconds per question)
        total_duration_seconds = 0
        tests_with_time = 0
        for e in enrollments:
            if e.started_at and e.submitted_at:
                total_duration_seconds += (e.submitted_at - e.started_at).total_seconds()
                tests_with_time += 1
        
        avg_speed = 0
        if total_questions > 0 and tests_with_time > 0:
            avg_speed = round(total_duration_seconds / total_questions)
        
        # 2. Score History & Speed history (Last 10)
        history_data = []
        speed_history = []
        history_labels = []
        
        for e in enrollments.order_by('-submitted_at')[:10][::-1]:
            history_data.append(round(e.percentage or 0))
            history_labels.append(e.submitted_at.strftime('%d %b'))
            
            # Individual test speed
            test_questions = QuestionSubmission.objects.filter(enrollment=e).count()
            if test_questions > 0 and e.started_at and e.submitted_at:
                test_duration = (e.submitted_at - e.started_at).total_seconds()
                speed_history.append(round(test_duration / test_questions))
            else:
                speed_history.append(0)
            
        # 3. Accuracy by Subject (Category)
        subject_accuracy = []
        subjects = Exam.objects.filter(enrollments__student=user).values_list('course__category', flat=True).distinct()
        for sub in subjects:
            if not sub: continue
            correct = submissions.filter(enrollment__exam__course__category=sub, is_correct=True).count()
            total = submissions.filter(enrollment__exam__course__category=sub).count()
            if total > 0:
                subject_accuracy.append({
                    'name': sub.capitalize(),
                    'value': round((correct / total) * 100)
                })

        # 4. Heatmap Data (Activity by day for last 6 months)
        from django.db.models.functions import TruncDate
        activity_data = enrollments.annotate(date=TruncDate('submitted_at')).values('date').annotate(count=Count('id')).order_by('date')
        
        # We'll return dates with activity counts
        heatmap = {item['date'].strftime('%Y-%m-%d'): item['count'] for item in activity_data}

        # 5. Strategic Metrics calculation
        overall_accuracy = round(submissions.filter(is_correct=True).count() / total_questions * 100) if total_questions > 0 else 0
        
        # Speed Score (Normalized: 30s or less = 100, 120s or more = 20)
        normalized_speed = 0
        if avg_speed > 0:
            normalized_speed = max(20, min(100, 120 - avg_speed))
            
        # Time Management (based on used time vs allowed duration)
        time_mgmt = 0
        time_mgmt_calcs = []
        for e in enrollments:
            if e.started_at and e.submitted_at and e.exam.duration_minutes:
                used_pct = ((e.submitted_at - e.started_at).total_seconds() / 60) / e.exam.duration_minutes
                # Best time management is using ~80-90% of time
                score = 100 - abs(85 - (used_pct * 100))
                time_mgmt_calcs.append(score)
        if time_mgmt_calcs:
            time_mgmt = sum(time_mgmt_calcs) / len(time_mgmt_calcs)

        return Response({
            'kpi': {
                'tests': total_tests,
                'questions': total_questions,
                'avg_score': round(avg_score, 1),
                'speed': f"{avg_speed}s"
            },
            'history': {
                'data': history_data,
                'speed_data': speed_history,
                'labels': history_labels
            },
            'subjects': subject_accuracy,
            'heatmap': heatmap,
            'strategic': [
                {'name': 'Accuracy', 'value': overall_accuracy},
                {'name': 'Speed', 'value': round(normalized_speed)},
                {'name': 'Concept', 'value': round(sum([s['value'] for s in subject_accuracy]) / len(subject_accuracy)) if subject_accuracy else 0},
                {'name': 'Time Mgmt', 'value': round(time_mgmt) if time_mgmt > 0 else 60},
                {'name': 'Revision', 'value': 75} # Partial Mock
            ]
        })


    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_from_scratch(self, request):
        """Creates an exam along with all its nested questions, options, and test cases."""
        data = request.data
        user = request.user

        if user.role not in ['instructor', 'admin']:
            return Response({'error': 'Only instructors can create exams.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            with transaction.atomic():
                # 1. Parse datetime fields properly
                from django.utils.dateparse import parse_datetime
                duration_minutes = int(data.get('duration_minutes', 60))

                raw_start = data.get('start_time')
                if isinstance(raw_start, str):
                    start_time = parse_datetime(raw_start) or timezone.now()
                else:
                    start_time = raw_start or timezone.now()
                # Ensure timezone-aware
                if timezone.is_naive(start_time):
                    start_time = timezone.make_aware(start_time)

                raw_end = data.get('end_time')
                if raw_end:
                    end_time = parse_datetime(raw_end) if isinstance(raw_end, str) else raw_end
                    if timezone.is_naive(end_time):
                        end_time = timezone.make_aware(end_time)
                else:
                    end_time = start_time + timedelta(minutes=duration_minutes)

                # 2. Create Exam
                try:
                    total_marks = float(data.get('total_marks', 100))
                except (TypeError, ValueError):
                    total_marks = 100.0
                    
                try:
                    passing_marks = float(data.get('passing_marks', 40))
                except (TypeError, ValueError):
                    passing_marks = 40.0

                exam = Exam.objects.create(
                    title=data.get('title', 'Untitled Exam'),
                    description=data.get('description', ''),
                    course_id=data.get('course_id'),
                    course_name=data.get('course_name', ''),
                    instructor=user,
                    start_time=start_time,
                    end_time=end_time,
                    duration_minutes=duration_minutes,
                    status=data.get('status', 'published'),
                    total_marks=total_marks,
                    passing_marks=passing_marks
                )

                # 2. Process Questions
                questions_data = data.get('questions', [])
                for idx, q_data in enumerate(questions_data):
                    q_type = q_data.get('type', 'mcq')
                    try:
                        q_marks = float(q_data.get('points', 1))
                    except (TypeError, ValueError):
                        q_marks = 1.0

                    question = Question.objects.create(
                        exam=exam,
                        question_type=q_type,
                        title=f"Question {idx + 1}",
                        description=q_data.get('text', ''),
                        marks=q_marks,
                        order=idx
                    )

                    if q_type == 'mcq':
                        mcq = MCQQuestion.objects.create(question=question)
                        options_data = q_data.get('options', [])
                        for opt_idx, opt_data in enumerate(options_data):
                            MCQOption.objects.create(
                                mcq_question=mcq,
                                option_text=opt_data.get('text', ''),
                                is_correct=opt_data.get('isCorrect', False),
                                order=opt_idx
                            )
                    
                    elif q_type == 'coding':
                        coding = CodingQuestion.objects.create(
                            question=question,
                            programming_language=q_data.get('language', 'python'),
                            starter_code=q_data.get('starterCode', ''),
                            solution_code=q_data.get('solutionCode', '')
                        )
                        test_cases_data = q_data.get('testCases', [])
                        for tc_idx, tc_data in enumerate(test_cases_data):
                            TestCase.objects.create(
                                coding_question=coding,
                                input_data=tc_data.get('input', ''),
                                expected_output=tc_data.get('output', ''),
                                is_visible=not tc_data.get('isHidden', False),
                                order=tc_idx
                            )

                serializer = ExamSerializer(exam)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def results_detail(self, request, pk=None):
        """Get detailed results for an exam including all students, scores, and violations."""
        exam = self.get_object()
        
        # Security check: Allow instructors/admins for all, students for their own record
        if request.user.role in ['instructor', 'admin']:
            enrollments = ExamEnrollment.objects.filter(exam=exam).select_related('student')
        else:
            enrollments = ExamEnrollment.objects.filter(exam=exam, student=request.user).select_related('student')
            if not enrollments.exists():
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        results = []
        for enrollment in enrollments:
            # Get session info if exists
            session = getattr(enrollment, 'session', None)
            
            # Basic student data
            student_data = {
                'id': enrollment.id,
                'student_id': enrollment.student.id,
                'name': enrollment.student.get_full_name() or enrollment.student.username,
                'email': enrollment.student.email,
                'score': enrollment.score,
                'percentage': enrollment.percentage,
                'result': enrollment.result,
                'status': enrollment.status,
                'submitted_at': enrollment.submitted_at,
                'time_taken': enrollment.time_taken_seconds,
                'violations_count': enrollment.total_violations,
                'integrity_score': enrollment.integrity_score,
                'is_blocked': enrollment.is_blocked,
                'is_auto_submitted': enrollment.is_auto_submitted,
                'has_session': session is not None
            }
            
            if session:
                # Add detailed session data for violations and logs
                session_serializer = ExamSessionSerializer(session, context={'request': request})
                student_data['session'] = session_serializer.data
                
                # Direct Activity inclusion for dynamic stream
                from exam_proctor_backend.apps.proctoring.serializers import ActivityLogSerializer
                activities_qs = session.activities.all()
                student_data['activities'] = ActivityLogSerializer(activities_qs, many=True).data
            else:
                student_data['session'] = None
                student_data['activities'] = []

            # Direct Violation inclusion for Integrity Log (Robust fallback)
            violations_qs = enrollment.violations.all()
            student_data['violations'] = ProctoringViolationSerializer(violations_qs, many=True, context={'request': request}).data
            
            # Fetch questions and dynamic student submissions
            questions_qs = Question.objects.filter(exam=exam).order_by('order')
            questions_list = []
            for q in questions_qs:
                qs_record = QuestionSubmission.objects.filter(enrollment=enrollment, question=q).first()
                q_data = {
                    'id': str(q.id),
                    'text': q.description or q.title or '',
                    'type': q.question_type,
                    'userAnswerId': None,
                    'correctAnswerId': None,
                    'options': [],
                    'explanation': 'Exam question'
                }
                
                if q.question_type == 'mcq':
                    mcq_q = getattr(q, 'mcq', None)
                    if mcq_q:
                        options = mcq_q.options.all().order_by('order')
                        for opt in options:
                            q_data['options'].append({
                                'id': str(opt.id),
                                'text': opt.option_text,
                                'isCorrect': opt.is_correct
                            })
                            if opt.is_correct:
                                q_data['correctAnswerId'] = str(opt.id)
                        
                        if qs_record:
                            mcq_sub = getattr(qs_record, 'mcq_submission', None)
                            if mcq_sub and mcq_sub.selected_option:
                                q_data['userAnswerId'] = str(mcq_sub.selected_option.id)
                elif q.question_type == 'coding':
                    if qs_record:
                        coding_sub = getattr(qs_record, 'coding_submission', None)
                        if coding_sub:
                            q_data['userAnswerId'] = coding_sub.submitted_code
                            
                questions_list.append(q_data)
                
            student_data['questions'] = questions_list
            results.append(student_data)

            
        # Calculate summary stats
        stats = enrollments.aggregate(
            avg_score=Avg('percentage'),
            max_score=Max('percentage'),
            min_score=Min('percentage'),
            pass_count=Count('pk', filter=Q(result='pass')),
            total_count=Count('pk')
        )
        
        # Proctoring summary
        total_violations = ProctoringViolation.objects.filter(enrollment__exam=exam).count()
        flagged_count = enrollments.filter(total_violations__gt=exam.violation_threshold).count()
        
        return Response({
            'exam': {
                'id': exam.id,
                'title': exam.title,
                'total_marks': exam.total_marks,
                'passing_marks': exam.passing_marks,
                'violation_threshold': exam.violation_threshold
            },
            'summary': {
                'total_students': stats['total_count'],
                'pass_count': stats['pass_count'],
                'avg_score': round(stats['avg_score'] or 0, 1),
                'max_score': stats['max_score'],
                'min_score': stats['min_score'],
                'total_violations': total_violations,
                'flagged_students': flagged_count
            },
            'students': results
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def block_enrollment(self, request, pk=None):
        """Block a student from a specific exam."""
        if request.user.role not in ['instructor', 'admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            enrollment = ExamEnrollment.objects.get(exam_id=pk, student_id=student_id)
            enrollment.is_blocked = True
            enrollment.save()
            return Response({'message': 'Student blocked successfully', 'is_blocked': True})
        except ExamEnrollment.DoesNotExist:
            return Response({'error': 'Enrollment not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unblock_enrollment(self, request, pk=None):
        """Unblock a student from a specific exam."""
        if request.user.role not in ['instructor', 'admin']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            enrollment = ExamEnrollment.objects.get(exam_id=pk, student_id=student_id)
            enrollment.is_blocked = False
            enrollment.save()
            return Response({'message': 'Student unblocked successfully', 'is_blocked': False})
        except ExamEnrollment.DoesNotExist:
            return Response({'error': 'Enrollment not found'}, status=status.HTTP_404_NOT_FOUND)


    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate_ai_content(self, request):
        """
        Extracts transcript from a YouTube URL and generates exam questions via Gemini AI.
        Returns AI-structured MCQs and Coding tasks.
        """
        data = request.data
        youtube_url = data.get('youtube_url')
        difficulty = data.get('difficulty', 'Intermediate')
        count = int(data.get('count', 5))
        include_coding = data.get('include_coding', True)

        if not youtube_url:
            return Response({'error': 'YouTube URL is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .youtube import fetch_transcript, generate_exam_content
            
            # 1. Fetch transcript
            print(f"Fetching transcript for: {youtube_url}")
            transcript = fetch_transcript(youtube_url)
            
            if not transcript:
                return Response({'error': 'Could not extract transcript from this video.'}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # 2. Generate questions
            print(f"Generating {count} questions (difficulty: {difficulty})...")
            questions = generate_exam_content(transcript, difficulty, count, include_coding)
            
            if not questions:
                return Response({
                    'error': 'Gemini AI failed to generate valid structured questions. This can happen if the transcript is too short or technical. Please try again or with a different video.'
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
            
            return Response({
                'success': True,
                'questions': questions,
                'transcript_length': len(transcript)
            })

        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExamEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = ExamEnrollment.objects.all()
    serializer_class = ExamEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['instructor', 'admin']:
            return ExamEnrollment.objects.filter(exam__instructor=user).select_related('student', 'exam')
        return ExamEnrollment.objects.filter(student=user).select_related('exam')


@api_view(['GET'])
def module_detail_api(request, module_id):
    module = get_object_or_404(Module, id=module_id)
    
    # Format timestamps
    timestamps_data = []
    for ts in module.timestamps.all().order_by('timestamp_seconds'):
        hours, remainder = divmod(ts.timestamp_seconds, 3600)
        minutes, secs = divmod(remainder, 60)
        ts_time_str = f"{minutes:02d}:{secs:02d}" if not hours else f"{hours:02d}:{minutes:02d}:{secs:02d}"
        timestamps_data.append({
            "id": ts.id,
            "seconds": ts.timestamp_seconds,
            "time": ts_time_str,
            "label": ts.label
        })
        
    progress = None
    if request.user and request.user.is_authenticated:
        progress = VideoProgress.objects.filter(student=request.user, module=module).first()
    progress_data = {
        "watch_time_seconds": progress.watch_time_seconds if progress else 0,
        "is_completed": progress.is_completed if progress else False
    }
    
    quiz = module.quizzes.first()
    challenge = module.coding_challenges.first()
    revision_sessions = module.revision_sessions.all().order_by('scheduled_time')
    
    return Response({
        "id": module.id,
        "course_id": module.course.id,
        "title": module.title,
        "description": module.description,
        "video_url": module.video_url,
        "order": module.order,
        "estimated_minutes": module.estimated_minutes or 60,
        "learning_day": module.learning_day or module.order,
        "watch_start_seconds": module.watch_start_seconds or 0,
        "watch_end_seconds": module.watch_end_seconds or 0,
        "source_video_id": module.source_video_id,
        "youtube_url": module.video_url or (f"https://www.youtube.com/watch?v={module.source_video_id}" if module.source_video_id else ""),
        "timestamps": timestamps_data,
        "progress": progress_data,
        "has_quiz": quiz is not None,
        "has_challenge": challenge is not None,
        "revision_sessions": [
            {
                "id": revision.id,
                "scheduled_time": revision.scheduled_time.isoformat() if revision.scheduled_time else "",
                "is_completed": revision.is_completed,
                "meeting_link": revision.meeting_link or ""
            }
            for revision in revision_sessions
        ]
    })

@api_view(['POST'])
def update_module_progress_api(request, module_id):
    module = get_object_or_404(Module, id=module_id)
    watch_time = int(request.data.get("watch_time_seconds") or 0)
    is_completed = bool(request.data.get("is_completed") or False)
    
    progress, _ = VideoProgress.objects.get_or_create(
        student=request.user,
        module=module
    )
    
    progress.watch_time_seconds = watch_time
    if is_completed:
        progress.is_completed = True
    progress.save()
    
    # Recalculate enrollment progress
    enrollment = CourseEnrollment.objects.filter(
        course=module.course,
        student=request.user
    ).first()
    
    if enrollment:
        all_modules = module.course.modules.all()
        module_ids = [m.id for m in all_modules]
        
        completed_count = VideoProgress.objects.filter(
            student=request.user,
            module_id__in=module_ids,
            is_completed=True
        ).count()
        
        enrollment.completed_lessons = completed_count
        enrollment.save()
        
        total_modules = all_modules.count()
        percentage = min(100, round((completed_count / total_modules) * 100)) if total_modules > 0 else 0
        
        progress_record, _ = CourseProgress.objects.get_or_create(
            enrollment=enrollment,
            course=module.course
        )
        progress_record.progress_percentage = percentage
        progress_record.status = "completed" if percentage == 100 else "in_progress" if percentage > 0 else "not_started"
        progress_record.save()
        
    return Response({
        "status": "success",
        "watch_time_seconds": progress.watch_time_seconds,
        "is_completed": progress.is_completed
    })

@api_view(['GET'])
def get_module_quiz_api(request, module_id):
    module = get_object_or_404(Module, id=module_id)
    quiz = module.quizzes.first()
    if not quiz:
        return Response({"error": "Quiz not found for this module"}, status=404)
        
    questions_data = []
    for quest in quiz.questions.all():
        try:
            options = json.loads(quest.options_json)
        except Exception:
            options = []
        questions_data.append({
            "id": quest.id,
            "question_text": quest.question_text,
            "options": options,
            "correct_option_index": quest.correct_option_index
        })
        
    return Response({
        "id": quiz.id,
        "course_id": module.course.id,
        "module_id": module.id,
        "title": quiz.title,
        "passing_score": quiz.passing_score,
        "questions": questions_data
    })

@api_view(['POST'])
def submit_quiz_attempt_api(request):
    quiz_id = int(request.data.get("quiz_id") or 0)
    score = float(request.data.get("score_percentage") or 0.0)
    is_passed = bool(request.data.get("is_passed") or False)
    
    quiz = get_object_or_404(Quiz, id=quiz_id)
    attempt = QuizAttempt.objects.create(
        student=request.user,
        quiz=quiz,
        score_percentage=score,
        is_passed=is_passed
    )
    recommendation = None
    if score < 35.0:
        recommendation = {
            "type": "relisten_lecture",
            "title": "Course Lecture Review Needed",
            "message": f"You scored {round(score)}% (<35%) in your quiz. We strongly recommend re-listening to your chosen course lecture video before re-attempting.",
            "needs_relisten": True,
            "allow_reattempt": True
        }

    return Response({
        "status": "success",
        "attempt_id": attempt.id,
        "is_passed": attempt.is_passed,
        "score_percentage": score,
        "recommendation": recommendation
    })

@api_view(['GET'])
def get_module_challenge_api(request, module_id):
    module = get_object_or_404(Module, id=module_id)
    challenge = module.coding_challenges.first()
    if not challenge:
        return Response({"error": "Coding challenge not found for this module"}, status=404)
        
    try:
        test_cases = json.loads(challenge.test_cases_json)
    except Exception:
        test_cases = []
        
    return Response({
        "id": challenge.id,
        "title": challenge.title,
        "instructions": challenge.instructions,
        "starter_code": challenge.starter_code,
        "solution_code": challenge.solution_code,
        "programming_language": challenge.programming_language,
        "test_cases": test_cases
    })

@api_view(['POST'])
def submit_challenge_attempt_api(request):
    challenge_id = int(request.data.get("challenge_id") or 0)
    code = str(request.data.get("submitted_code") or "")
    is_passed = bool(request.data.get("is_passed") or False)
    feedback = str(request.data.get("feedback") or "")
    
    challenge = get_object_or_404(CodingChallenge, id=challenge_id)
    submission = ChallengeSubmission.objects.create(
        student=request.user,
        challenge=challenge,
        submitted_code=code,
        is_passed=is_passed,
        feedback=feedback
    )
    recommendation = None
    if not is_passed:
        quiz = challenge.module.quizzes.first()
        quiz_score = 85
        if quiz:
            latest_quiz_att = QuizAttempt.objects.filter(student=request.user, quiz=quiz).order_by('-completed_at').first()
            if latest_quiz_att:
                quiz_score = round(latest_quiz_att.score_percentage)

        concept = f"{challenge.title}: Implementation Logic"
        reason = f"You understood the core concepts in the quiz ({quiz_score}%), but struggled with hands-on coding execution and test assertions."
        
        try:
            remediation_item, _ = CodeRemediationItem.objects.get_or_create(
                student=request.user,
                concept_name=concept,
                defaults={
                    'course_title': challenge.module.course.title,
                    'module_title': challenge.module.title,
                    'status': 'needs_practice',
                    'quiz_score': quiz_score,
                    'challenge_score': 30,
                    'diagnosis_reason': reason,
                    'starter_code': challenge.starter_code or "# Practice your solution here\n",
                    'solution_code': challenge.solution_code or "",
                    'practice_hint': "Focus on edge conditions, indentation, and return types.",
                    'test_cases_json': challenge.test_cases_json or "[]"
                }
            )
            remed_id = remediation_item.id
        except Exception:
            remed_id = 1

        recommendation = {
            "type": "code_remediation",
            "title": "Concepts Understood, Coding Lagging",
            "concept_name": concept,
            "message": f"You understand the concepts well ({quiz_score}% in Quiz), but you are lagging in hands-on coding for '{challenge.title}'. We've assigned targeted exercises in your Code Remediation track.",
            "remediation_id": remed_id,
            "remediation_url": "/code-remediation"
        }

    return Response({
        "status": "success",
        "submission_id": submission.id,
        "is_passed": submission.is_passed,
        "recommendation": recommendation
    })

@api_view(['POST'])
def module_chat_api(request, module_id):
    module = get_object_or_404(Module, id=module_id)
    user_message = request.data.get("message") or ""
    if not user_message.strip():
        return Response({"error": "Message content is required"}, status=400)

    # Ensure Gemini API key is configured
    from .services import GEMINI_API_KEY
    if not GEMINI_API_KEY:
        return Response({
            "reply": (
                f"**AI Tutor is currently unavailable** for *{module.title}*.\n\n"
                "The server administrator has not configured a Gemini API key. "
                "Please contact your instructor or admin to enable the AI Tutor feature."
            )
        })

    # Find transcript context for this module's specific video
    transcript_context = ""
    try:
        # Primary: match by module's source video ID
        source_vid = getattr(module, 'source_video_id', None)
        transcript = None
        if source_vid:
            transcript = VideoTranscript.objects.filter(youtube_video_id=source_vid).first()
        # Fallback: course-level single-video transcript
        if not transcript and module.course.youtube_video_id:
            transcript = VideoTranscript.objects.filter(youtube_video_id=module.course.youtube_video_id).first()
        # Fallback: any transcript linked to the course
        if not transcript:
            transcript = VideoTranscript.objects.filter(course=module.course).first()
        if transcript:
            transcript_context = transcript.full_transcript[:8000]
    except Exception:
        pass

    # Construct prompt for Socratic tutor
    system_prompt = (
        "You are an expert Socratic AI Coach. You are helping a student learn a module called "
        f"'{module.title}' in the course '{module.course.title}'.\n\n"
        f"Here is the module description:\n{module.description}\n\n"
    )
    if transcript_context:
        system_prompt += f"Here is some relevant context from the video transcript:\n{transcript_context}\n\n"

    system_prompt += (
        "Guidelines for your response:\n"
        "1. Respond in a Socratic manner. Do NOT just give the answer directly. "
        "Instead, ask probing questions, explain concepts with intuitive analogies, and guide the student step-by-step to discover the answer themselves.\n"
        "2. Keep your answers concise, beautifully formatted in Markdown, and structured.\n"
        "3. Maintain a highly professional, encouraging, and intellectual tone.\n"
        "4. If requested, write clean, well-commented code snippets in Markdown code blocks.\n"
        "5. Never say 'Based on the provided transcript...'. Be an active, natural tutor."
    )

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(FLASH_MODEL, system_instruction=system_prompt)
        chat = model.start_chat(history=[])
        prompt = f"Student asks: {user_message}"
        response = chat.send_message(prompt)
        reply_text = response.text
    except Exception as e:
        print(f"Gemini API failure in AI Tutor: {e}")
        reply_text = (
            f"I'm happy to help you understand **{module.title}**! Let's think about this "
            "concept step-by-step. What specific part of this lesson feels most confusing to you right now? "
            "Try breaking down the code or core mechanism you just saw in the video."
        )

    return Response({
        "reply": reply_text
    })
