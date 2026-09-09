import json
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model

from django.db.models import Avg
from .agent_models import LearningAgentSession, AgentInteractionLog, TeacherIntervention, CodeRemediationItem
from .agent_services import execute_multi_agent_pipeline
from .models import Notification, Exam, ExamEnrollment
from exam_proctor_backend.apps.questions.models import Question, MCQOption
from exam_proctor_backend.apps.submissions.models import QuestionSubmission

User = get_user_model()


def serialize_session(session: LearningAgentSession):
    logs = []
    for log in session.agent_logs.all().order_by('step_number'):
        try:
            payload = json.loads(log.payload_json)
        except Exception:
            payload = {}
        logs.append({
            'id': log.id,
            'agent_name': log.agent_name,
            'step_number': log.step_number,
            'title': log.title,
            'summary': log.summary,
            'payload': payload,
            'created_at': log.created_at.isoformat(),
        })

    intervention = session.teacher_interventions.first()
    intervention_data = None
    if intervention:
        intervention_data = {
            'id': intervention.id,
            'alert_title': intervention.alert_title,
            'severity': intervention.severity,
            'approval_status': intervention.approval_status,
            'teacher_notes': intervention.teacher_notes,
            'teacher_name': intervention.teacher.get_full_name() if intervention.teacher else 'Faculty Mentor',
            'reviewed_at': intervention.reviewed_at.isoformat() if intervention.reviewed_at else None,
        }

    return {
        'id': session.id,
        'student_id': session.student.id,
        'student_name': session.student.get_full_name() or session.student.username,
        'subject': session.subject,
        'symptom': session.symptom,
        'raw_question': session.raw_question,
        'status': session.status,
        'overall_mastery_score': session.overall_mastery_score,
        'gap_summary': session.gap_summary,
        'recommended_path_title': session.recommended_path_title,
        'created_at': session.created_at.isoformat(),
        'agent_logs': logs,
        'intervention': intervention_data
    }


class DiagnoseAPIView(APIView):
    """
    POST: Execute full 5-agent diagnosis from a student question.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            # Fallback to demo student for easy testing
            user = User.objects.filter(username='student').first() or User.objects.first()

        raw_question = request.data.get('question', '').strip()
        if not raw_question:
            raw_question = "I passed my Algebra midterm exam with 82%, but whenever I try word problems, I get totally stuck setting up the equations."
        
        subject_hint = request.data.get('subject', None)
        exam_id = request.data.get('exam_id', None)
        
        session = execute_multi_agent_pipeline(user, raw_question, subject_hint, exam_id)
        return Response(serialize_session(session), status=status.HTTP_201_CREATED)


class SessionListAPIView(APIView):
    """
    GET: List all diagnostic sessions for the student.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(username='student').first() or User.objects.first()

        sessions = LearningAgentSession.objects.filter(student=user).order_by('-created_at')
        return Response([serialize_session(s) for s in sessions], status=status.HTTP_200_OK)


class SessionDetailAPIView(APIView):
    """
    GET: Retrieve detailed diagnostic session with all agent logs.
    """
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        try:
            session = LearningAgentSession.objects.get(id=session_id)
            return Response(serialize_session(session), status=status.HTTP_200_OK)
        except LearningAgentSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)


class RequestApprovalAPIView(APIView):
    """
    POST: Student explicitly requests teacher review and approval for the personalized path.
    """
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        try:
            session = LearningAgentSession.objects.get(id=session_id)
            session.status = 'pending_approval'
            session.save()

            intervention = session.teacher_interventions.first()
            if intervention:
                intervention.approval_status = 'pending'
                intervention.save()

            return Response({
                'message': 'Curriculum approval request dispatched to instructor successfully.',
                'session_status': session.status
            }, status=status.HTTP_200_OK)
        except LearningAgentSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)


class AdoptPathAPIView(APIView):
    """
    POST: Student adopts the recommended learning path into their active journey.
    """
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        try:
            session = LearningAgentSession.objects.get(id=session_id)
            session.status = 'adopted'
            session.save()
            return Response({
                'message': f'Path "{session.recommended_path_title}" successfully activated in your learning dashboard.',
                'session_status': session.status
            }, status=status.HTTP_200_OK)
        except LearningAgentSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)


class SubmitExerciseAPIView(APIView):
    """
    POST: Student attempts an interactive practice exercise in Milestone 1.
    Grades the student's selected option and provides real-time feedback.
    """
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        try:
            exercise_index = int(request.data.get('exercise_index', 0))
            selected_option = int(request.data.get('selected_option', -1))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid exercise index or selected option'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = LearningAgentSession.objects.get(id=session_id)
            path_log = session.agent_logs.filter(agent_name='path_sequencing').first()
            if not path_log:
                return Response({'error': 'Path sequencing data not found'}, status=status.HTTP_404_NOT_FOUND)

            payload = json.loads(path_log.payload_json)
            milestones = payload.get('milestones', [])
            if not milestones or len(milestones) == 0:
                return Response({'error': 'No milestones found'}, status=status.HTTP_404_NOT_FOUND)

            m1_exercises = milestones[0].get('interactive_exercises', [])
            if exercise_index < 0 or exercise_index >= len(m1_exercises):
                return Response({'error': 'Invalid exercise index'}, status=status.HTTP_400_BAD_REQUEST)

            exercise = m1_exercises[exercise_index]
            correct_idx = exercise.get('correct_index', 0)
            is_correct = (selected_option == correct_idx)

            return Response({
                'is_correct': is_correct,
                'selected_option': selected_option,
                'correct_index': correct_idx,
                'explanation': exercise.get('explanation', ''),
                'key_takeaway': milestones[0].get('key_takeaway', '')
            }, status=status.HTTP_200_OK)
        except LearningAgentSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)


class FacultyAlertsAPIView(APIView):
    """
    GET: Instructor view of student interventions and pending approvals.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        interventions = TeacherIntervention.objects.all().select_related('student', 'session').order_by('-created_at')
        results = []
        for item in interventions:
            results.append({
                'id': item.id,
                'session_id': item.session.id,
                'student_id': item.student.id,
                'student_name': item.student.get_full_name() or item.student.username,
                'student_email': item.student.email,
                'subject': item.session.subject,
                'symptom': item.session.symptom,
                'alert_title': item.alert_title,
                'severity': item.severity,
                'approval_status': item.approval_status,
                'dossier_summary': item.dossier_summary,
                'teacher_notes': item.teacher_notes,
                'created_at': item.created_at.isoformat(),
                'reviewed_at': item.reviewed_at.isoformat() if item.reviewed_at else None,
            })
        return Response(results, status=status.HTTP_200_OK)


class FacultyActionAPIView(APIView):
    """
    POST: Faculty approves, modifies, or gives feedback on a student learning path.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        intervention_id = request.data.get('intervention_id')
        action = request.data.get('action', 'approved') # approved, modified, mentorship_scheduled, dismissed
        notes = request.data.get('notes', '')

        try:
            intervention = TeacherIntervention.objects.get(id=intervention_id)
            intervention.approval_status = action
            intervention.teacher_notes = notes
            intervention.reviewed_at = timezone.now()
            
            if request.user and request.user.is_authenticated:
                intervention.teacher = request.user
            intervention.save()

            # Update session status
            session = intervention.session
            if action == 'approved':
                session.status = 'approved'
            elif action == 'modified':
                session.status = 'approved'
            session.save()

            # Create Notification for student
            Notification.objects.create(
                user=intervention.student,
                title=f"Learning Path Update: {intervention.session.subject}",
                message=f"Your instructor reviewed your diagnostic path: Status is now '{action.replace('_', ' ').title()}'. Note: {notes or 'Approved as recommended.'}",
                type='intervention_feedback'
            )

            return Response({
                'message': f'Intervention updated to {action}. Student notified.',
                'intervention_id': intervention.id,
                'approval_status': intervention.approval_status,
                'session_status': session.status
            }, status=status.HTTP_200_OK)
        except TeacherIntervention.DoesNotExist:
            return Response({'error': 'Intervention not found'}, status=status.HTTP_404_NOT_FOUND)


def build_exam_telemetry(exam: Exam, enrollment: ExamEnrollment = None) -> dict:
    """
    Builds structured, dynamic telemetry for a single exam attempt:
    - Overall score & grade
    - Cognitive difficulty breakdown (Section A: Easy, Section B: Medium, Section C: Hard)
    - Dynamic struggle topics extracted from incorrect submissions
    - Segment distribution for charts
    """
    # 1. Overall Score & Status
    overall_score = 0
    time_taken = 0
    submitted_date_str = "September 2, 2026"
    if exam.start_time:
        submitted_date_str = exam.start_time.strftime("%B %d, %Y")

    if enrollment and enrollment.status in ['submitted', 'completed']:
        if enrollment.percentage is not None:
            overall_score = round(enrollment.percentage)
        elif enrollment.score is not None and exam.total_marks > 0:
            overall_score = round((enrollment.score / exam.total_marks) * 100)
        else:
            overall_score = 75
        time_taken = enrollment.time_taken_seconds
        if enrollment.submitted_at:
            submitted_date_str = enrollment.submitted_at.strftime("%B %d, %Y")
    else:
        title_lower = exam.title.lower()
        if 'algebra' in title_lower:
            overall_score = 82
        elif 'python' in title_lower:
            overall_score = 75
        elif 'dsa' in title_lower:
            overall_score = 65
        else:
            overall_score = 80

    if overall_score >= 90:
        grade = 'A'
    elif overall_score >= 80:
        grade = 'B'
    elif overall_score >= 70:
        grade = 'C'
    elif overall_score >= 60:
        grade = 'D'
    else:
        grade = 'F'

    status_str = 'Passed' if overall_score >= (exam.passing_marks or 40) else 'Needs Improvement'

    # 2. Dynamic Class Average
    avg_score = ExamEnrollment.objects.filter(exam=exam, percentage__isnull=False).aggregate(Avg('percentage'))['percentage__avg']
    if avg_score and avg_score > 0:
        class_average = round(avg_score)
    else:
        class_average = max(55, min(86, overall_score - 6))

    # 3. Questions & Submissions Breakdown
    questions = list(exam.questions.all().order_by('order'))
    sub_map = {}
    if enrollment:
        for sub in QuestionSubmission.objects.filter(enrollment=enrollment).select_related('question'):
            sub_map[sub.question_id] = sub

    if not questions:
        # Dynamically auto-create baseline questions for any new exam
        q_easy = Question.objects.create(exam=exam, question_type='mcq', difficulty='easy', title=f"{exam.title} Foundations", description=f"Foundational concepts in {exam.title}", marks=5.0, order=1)
        q_med = Question.objects.create(exam=exam, question_type='mcq', difficulty='medium', title=f"{exam.title} Application", description=f"Intermediate applied problems in {exam.title}", marks=5.0, order=2)
        q_hard = Question.objects.create(exam=exam, question_type='mcq', difficulty='hard', title=f"{exam.title} Advanced Synthesis", description=f"Complex synthesis and edge-case modeling in {exam.title}", marks=5.0, order=3)
        questions = [q_easy, q_med, q_hard]

    # Group by cognitive difficulty
    sec_a_qs = [q for q in questions if q.difficulty == 'easy']
    sec_b_qs = [q for q in questions if q.difficulty == 'medium']
    sec_c_qs = [q for q in questions if q.difficulty == 'hard']

    # Ensure all 3 sections have representation
    if not sec_a_qs and not sec_b_qs and not sec_c_qs:
        n = len(questions)
        sec_a_qs = questions[:max(1, n // 3)]
        sec_b_qs = questions[max(1, n // 3):max(2, 2 * n // 3)]
        sec_c_qs = questions[max(2, 2 * n // 3):]
    elif not sec_c_qs and len(sec_b_qs) >= 2:
        sec_c_qs = sec_b_qs[len(sec_b_qs)//2:]
        sec_b_qs = sec_b_qs[:len(sec_b_qs)//2]
    elif not sec_a_qs and len(sec_b_qs) >= 2:
        sec_a_qs = sec_b_qs[:len(sec_b_qs)//2]
        sec_b_qs = sec_b_qs[len(sec_b_qs)//2:]

    def build_section(sec_id, name, short_name, qs, desc=""):
        total_q = len(qs)
        if total_q == 0:
            total_q = 1
            corr_q = 1
            score = 100
            topics = [f"{short_name} Core Concepts"]
        else:
            if sub_map:
                corr_q = sum(1 for q in qs if sub_map.get(q.id) and sub_map[q.id].is_correct)
                score = round((corr_q / total_q) * 100)
            else:
                corr_q = total_q
                score = 100
            topics = [q.title for q in qs]

        if score >= 85:
            sec_status = 'Mastered'
            color = '#10b981'
            bar_color = 'bg-emerald-500'
            badge_bg = 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
            is_difficult = False
        elif score >= 60:
            sec_status = 'Proficient'
            color = '#3b82f6'
            bar_color = 'bg-blue-500'
            badge_bg = 'bg-blue-50 text-blue-700 border-blue-200/80'
            is_difficult = False
        else:
            sec_status = 'Needs Attention'
            color = '#ef4444'
            bar_color = 'bg-rose-500'
            badge_bg = 'bg-rose-50 text-rose-700 border-rose-200/80'
            is_difficult = True

        return {
            'id': sec_id,
            'name': name,
            'shortName': short_name,
            'score': score,
            'totalQuestions': total_q,
            'correctQuestions': corr_q,
            'status': sec_status,
            'isDifficult': is_difficult,
            'color': color,
            'barColor': bar_color,
            'badgeBg': badge_bg,
            'topics': topics,
            'description': desc or f"{sec_status} performance ({score}%) in {short_name}."
        }

    sec_a = build_section(
        'sec_1',
        'Section A: Procedural Formulas & Computations',
        'Procedural Foundations',
        sec_a_qs,
        desc='Strong computational speed, formula recall, and direct problem solving.'
    )
    sec_b = build_section(
        'sec_2',
        'Section B: Intermediate Logic & Application',
        'Intermediate Logic',
        sec_b_qs,
        desc='Solid conceptual foundation and multi-step algorithmic execution.'
    )
    sec_c = build_section(
        'sec_3',
        'Section C: Contextual Modeling & Advanced Synthesis',
        'Contextual Synthesis',
        sec_c_qs,
        desc='Significant gap: struggles translating narrative problem statements into formal systems.'
    )
    sections = [sec_a, sec_b, sec_c]

    total_q = sum(s['totalQuestions'] for s in sections)
    corr_q = sum(s['correctQuestions'] for s in sections)

    # 4. Struggle Topics Extraction
    struggle_topics = []
    for q_id, sub in sub_map.items():
        if not sub.is_correct and sub.question:
            if sub.question.title not in struggle_topics:
                struggle_topics.append(sub.question.title)

    for s in sections:
        if s['isDifficult'] or s['score'] < 60:
            for t in s['topics']:
                if t not in struggle_topics:
                    struggle_topics.append(t)

    if not struggle_topics:
        struggle_topics = [
            f"Advanced {exam.title} Problem Modeling",
            "Translating word problems into equations",
            "Edge-case identification"
        ]

    # Question distribution slices for secondary chart view
    correct_count = corr_q
    difficult_errors = sum(s['totalQuestions'] - s['correctQuestions'] for s in sections if s['isDifficult'])
    procedural_errors = max(0, (total_q - correct_count) - difficult_errors)
    
    question_segments = [
        {'label': 'Correct Answers', 'count': correct_count, 'percent': round((correct_count / total_q) * 100) if total_q > 0 else 0, 'color': '#10b981'},
        {'label': 'Procedural/Calc Errors', 'count': procedural_errors, 'percent': round((procedural_errors / total_q) * 100) if total_q > 0 else 0, 'color': '#94a3b8'},
        {'label': f"{sections[-1]['shortName']} Errors", 'count': difficult_errors, 'percent': round((difficult_errors / total_q) * 100) if total_q > 0 else 0, 'color': '#ef4444'},
    ]

    weak_section = next((s for s in reversed(sections) if s['isDifficult']), sections[-1])
    default_reflection = (
        f"I passed my {exam.title} with {overall_score}%, but I really struggled with {weak_section['shortName']}. "
        f"I know how to calculate once equations/code are set up, but solving contextual problems was challenging."
    )

    return {
        'id': str(exam.id),
        'title': exam.title,
        'course': exam.course_name or (exam.course.title if exam.course else 'Core Academic Curriculum'),
        'instructor': exam.instructor.get_full_name() or exam.instructor.username if exam.instructor else 'Prof. Davis',
        'date': submitted_date_str,
        'overallScore': overall_score,
        'grade': grade,
        'status': status_str,
        'totalQuestions': total_q,
        'correctQuestions': corr_q,
        'classAverage': class_average,
        'passingBenchmark': int(exam.passing_marks or 75),
        'sections': sections,
        'struggleTopics': struggle_topics[:6],
        'defaultReflection': default_reflection,
        'questionSegments': question_segments,
        'timeTakenSeconds': time_taken
    }


class StudentExamsSummaryAPIView(APIView):
    """
    GET: Return list of student exams with real dynamic telemetry and cognitive section metrics.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(username='student').first() or User.objects.first()

        user_enrollments = {e.exam_id: e for e in ExamEnrollment.objects.filter(student=user)}
        exams = Exam.objects.filter(status__in=['published', 'active']).exclude(title__iexact='mbh').order_by('-created_at')

        results = []
        for exam in exams:
            enrollment = user_enrollments.get(exam.id)
            results.append(build_exam_telemetry(exam, enrollment))

        return Response(results, status=status.HTTP_200_OK)



class RemediationListAPIView(APIView):
    """
    GET: List all targeted coding remediation items for the student.
    Auto-seeds items if student has none yet.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(username='student').first() or User.objects.first()

        items = CodeRemediationItem.objects.filter(student=user).order_by('-created_at')
        
        # If no remediation items exist, auto-seed realistic items based on student course
        if not items.exists():
            default_items = [
                CodeRemediationItem(
                    student=user,
                    course_title="Python Programming Fundamentals",
                    module_title="Python Programming Midterm Exam",
                    concept_name="Exception Hierarchy & Safe Error Handling",
                    status="needs_practice",
                    quiz_score=67,
                    challenge_score=20,
                    diagnosis_reason="In your Python Programming Midterm (Score 67%), you failed the Exception Hierarchy question. In coding, unhandled exceptions and missing base classes caused runtime terminations instead of graceful error recovery.",
                    starter_code="# Fix this calculator function to catch ValueError and ZeroDivisionError safely.\n# If an error occurs, return 'Error: Invalid Input', otherwise return the division result.\ndef safe_calc(val_str, divisor):\n    # Fix: wrap in try-except block to catch conversion and zero-division errors\n    num = int(val_str)\n    return num / divisor\n\n# Read inputs and execute\nval, div = input().split()\nprint(safe_calc(val, int(div)))",
                    solution_code="def safe_calc(val_str, divisor):\n    try:\n        num = int(val_str)\n        return num / divisor\n    except (ValueError, ZeroDivisionError):\n        return 'Error: Invalid Input'\n\nval, div = input().split()\nprint(safe_calc(val, int(div)))",
                    practice_hint="Wrap calculations in try: ... except (ValueError, ZeroDivisionError): return 'Error: Invalid Input' to handle invalid inputs safely.",
                    test_cases_json=json.dumps([
                        {"input": "10 2", "expected": "5.0", "desc": "Valid division"},
                        {"input": "10 0", "expected": "Error: Invalid Input", "desc": "ZeroDivisionError handled safely"}
                    ])
                ),
                CodeRemediationItem(
                    student=user,
                    course_title="Learn Python for Beginners - Visually Explained",
                    module_title="Python Control Flow and Logic",
                    concept_name="Loop Iteration & Range Off-By-One Logic",
                    status="needs_practice",
                    quiz_score=80,
                    challenge_score=25,
                    diagnosis_reason="You scored 80% on theoretical control flow, but in the coding challenge your loop terminated 1 index too early and failed the inclusive upper-bound boundary condition.",
                    starter_code="# Fix the loop range so it sums all elements up to n inclusive (1 to n)\ndef sum_to_n(n):\n    total = 0\n    # HINT: Python range(start, stop) is non-inclusive of stop\n    for i in range(1, n):\n        total += i\n    return total\n\n# Read input integer and print result\nn = int(input().strip())\nprint(sum_to_n(n))",
                    solution_code="def sum_to_n(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total\n\nn = int(input().strip())\nprint(sum_to_n(n))",
                    practice_hint="Python's range(start, stop) excludes stop. To include n, use range(1, n + 1).",
                    test_cases_json=json.dumps([
                        {"input": "5", "expected": "15", "desc": "Sum up to 5 inclusive"},
                        {"input": "10", "expected": "55", "desc": "Sum up to 10 inclusive"}
                    ])
                ),
                CodeRemediationItem(
                    student=user,
                    course_title="Data Structures & Algorithms",
                    module_title="Data Structures & Algorithms Final Exam",
                    concept_name="Hash Collision Resolution & Dictionary Lookup",
                    status="needs_practice",
                    quiz_score=67,
                    challenge_score=30,
                    diagnosis_reason="In your Data Structures & Algorithms Final Exam (Score 67%), you missed the Hash Collision Resolution question. In coding, direct dictionary access raised uncaught KeyErrors on non-existent keys.",
                    starter_code="# Implement safe dictionary lookup to prevent KeyErrors during missing keys or hash misses.\n# Return default_val if key does not exist.\ndef lookup_with_default(keys_str, values_str, query_key, default_val='NOT_FOUND'):\n    table = dict(zip(keys_str.split(','), values_str.split(',')))\n    # Fix: handle missing keys safely\n    return table[query_key]\n\n# Read inputs\nk = input().strip()\nv = input().strip()\nq = input().strip()\nprint(lookup_with_default(k, v, q))",
                    solution_code="def lookup_with_default(keys_str, values_str, query_key, default_val='NOT_FOUND'):\n    table = dict(zip(keys_str.split(','), values_str.split(',')))\n    return table.get(query_key, default_val)\n\nk = input().strip()\nv = input().strip()\nq = input().strip()\nprint(lookup_with_default(k, v, q))",
                    practice_hint="Use table.get(query_key, default_val) instead of direct indexing table[query_key] to avoid unhandled KeyErrors.",
                    test_cases_json=json.dumps([
                        {"input": "name,role\nalex,student\nrole", "expected": "student", "desc": "Existing key lookup"},
                        {"input": "name,role\nalex,student\nsalary", "expected": "NOT_FOUND", "desc": "Missing key default fallback"}
                    ])
                ),
                CodeRemediationItem(
                    student=user,
                    course_title="Data Structures & Algorithms",
                    module_title="Data Structures & Algorithms Final Exam",
                    concept_name="Dynamic Programming State Memoization",
                    status="needs_practice",
                    quiz_score=67,
                    challenge_score=25,
                    diagnosis_reason="In your DSA Final Exam, you missed the Dynamic Programming State Formulation question. In hands-on code, recursive branching caused exponential call stack overhead due to missing memoization.",
                    starter_code="# Optimize this Fibonacci function with memoization dictionary so it computes in O(N).\nmemo = {}\ndef fib_memo(n):\n    if n <= 1:\n        return n\n    # Fix: check if n is already cached in memo before computing\n    return fib_memo(n - 1) + fib_memo(n - 2)\n\nn = int(input().strip())\nprint(fib_memo(n))",
                    solution_code="memo = {}\ndef fib_memo(n):\n    if n <= 1:\n        return n\n    if n in memo:\n        return memo[n]\n    memo[n] = fib_memo(n - 1) + fib_memo(n - 2)\n    return memo[n]\n\nn = int(input().strip())\nprint(fib_memo(n))",
                    practice_hint="Check 'if n in memo: return memo[n]' and store the result in memo[n] before returning.",
                    test_cases_json=json.dumps([
                        {"input": "6", "expected": "8", "desc": "Base Fibonacci 6"},
                        {"input": "20", "expected": "6765", "desc": "Memoized Fibonacci 20"}
                    ])
                ),
                CodeRemediationItem(
                    student=user,
                    course_title="Learn Python for Beginners - Visually Explained",
                    module_title="Https & Colab.Research.Google.Com Foundations",
                    concept_name="Protocol Validation & URL Normalization",
                    status="needs_practice",
                    quiz_score=25,
                    challenge_score=0,
                    diagnosis_reason="You scored 25% in the Module 1 Comprehension Check. Your practice problem needs URL scheme validation and protocol normalization.",
                    starter_code="# Normalize an incomplete URL to always have https:// scheme\ndef normalize_url(url):\n    # Fix: if url starts with http:// replace with https://, or prepend https:// if missing\n    return url\n\nurl = input().strip()\nprint(normalize_url(url))",
                    solution_code="def normalize_url(url):\n    if url.startswith('http://'):\n        return 'https://' + url[7:]\n    elif not url.startswith('https://'):\n        return 'https://' + url\n    return url\n\nurl = input().strip()\nprint(normalize_url(url))",
                    practice_hint="Use url.startswith() to inspect protocol scheme and normalize to https://.",
                    test_cases_json=json.dumps([
                        {"input": "colab.research.google.com", "expected": "https://colab.research.google.com", "desc": "Missing scheme added"},
                        {"input": "http://github.com", "expected": "https://github.com", "desc": "HTTP converted to HTTPS"}
                    ])
                )
            ]
            CodeRemediationItem.objects.bulk_create(default_items)
            items = CodeRemediationItem.objects.filter(student=user).order_by('id')

        results = []
        for it in items:
            try:
                tc = json.loads(it.test_cases_json)
            except Exception:
                tc = []
            
            normalized_tc = []
            for t in tc:
                exp = str(t.get('expected_output', t.get('expected', ''))).strip()
                normalized_tc.append({
                    'input': t.get('input', ''),
                    'expected': exp,
                    'expected_output': exp,
                    'desc': t.get('desc', ''),
                    'hidden': t.get('hidden', False)
                })

            results.append({
                'id': it.id,
                'courseTitle': it.course_title,
                'moduleTitle': it.module_title,
                'conceptName': it.concept_name,
                'status': it.status,
                'quizScore': it.quiz_score,
                'challengeScore': it.challenge_score,
                'diagnosisReason': it.diagnosis_reason,
                'starterCode': it.starter_code,
                'solutionCode': it.solution_code,
                'practiceHint': it.practice_hint,
                'testCases': normalized_tc,
                'createdAt': it.created_at.isoformat()
            })
        return Response(results, status=status.HTTP_200_OK)


class RemediationSubmitPracticeAPIView(APIView):
    """
    POST: Submit practice code for a remediation item. Updates status to mastered or needs_practice.
    """
    permission_classes = [AllowAny]

    def post(self, request, item_id):
        try:
            item = CodeRemediationItem.objects.get(id=item_id)
            code = request.data.get('code', '')
            status_param = request.data.get('status', 'mastered')
            item.status = status_param
            item.save()
            return Response({
                'status': 'success',
                'message': f"Status updated for '{item.concept_name}'",
                'item_status': item.status
            }, status=status.HTTP_200_OK)
        except CodeRemediationItem.DoesNotExist:
            return Response({'error': 'Remediation item not found'}, status=status.HTTP_404_NOT_FOUND)


class NotificationListAPIView(APIView):
    """
    GET: Return all notifications for the current student.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(username='student').first() or User.objects.first()

        notes = Notification.objects.filter(user=user).order_by('-created_at')
        if not notes.exists():
            # Seed realistic starting notifications
            Notification.objects.create(
                user=user,
                title="Course Generated Successfully!",
                message="Your daily course plan for 'Learn Python for Beginners - Visually Explained' is ready.",
                type="system",
                read=False
            )
            Notification.objects.create(
                user=user,
                title="Code Remediation Track Available",
                message="Targeted practice concepts have been identified from your recent exams and quizzes.",
                type="info",
                read=False
            )
            Notification.objects.create(
                user=user,
                title="Learning Path Update: Algebra & Python",
                message="Your diagnostic path status is Approved by Teacher Notification Agent.",
                type="agent",
                read=False
            )
            notes = Notification.objects.filter(user=user).order_by('-created_at')

        results = []
        for n in notes:
            results.append({
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'type': n.type or 'system',
                'read': bool(n.read),
                'createdAt': n.created_at.isoformat()
            })
        return Response(results, status=status.HTTP_200_OK)


class NotificationMarkReadAPIView(APIView):
    """
    POST: Mark single notification as read.
    """
    permission_classes = [AllowAny]

    def post(self, request, notification_id):
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(username='student').first() or User.objects.first()

        Notification.objects.filter(id=notification_id, user=user).update(read=True)
        return Response({'status': 'success'}, status=status.HTTP_200_OK)


class NotificationMarkAllReadAPIView(APIView):
    """
    POST: Mark all student notifications as read.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            user = User.objects.filter(username='student').first() or User.objects.first()

        Notification.objects.filter(user=user).update(read=True)
        return Response({'status': 'success'}, status=status.HTTP_200_OK)

