"""
Seed script: Creates courses, enrolls students, updates users.
Run with: py seed_data.py
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_proctor_backend.core.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from exam_proctor_backend.apps.exams.models import Course, CourseEnrollment, Exam, ExamEnrollment
from exam_proctor_backend.apps.questions.models import Question, MCQQuestion, MCQOption, CodingQuestion, TestCase

User = get_user_model()

# ── Ensure Users ─────────────────────────────────────────────────────
def ensure_user(username, email, password, role, first_name, last_name, **kwargs):
    try:
        user = User.objects.get(username=username)
        user.set_password(password)
        user.role = role
        user.first_name = first_name
        user.last_name = last_name
        for k, v in kwargs.items():
            setattr(user, k, v)
        user.save()
        print(f"  Updated: {username} ({role})")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=username, email=email, password=password,
            role=role, first_name=first_name, last_name=last_name,
            **kwargs
        )
        print(f"  Created: {username} ({role})")
    return user

# ── Question Helpers ────────────────────────────────────────────────
def create_mcq(exam, title, description, options, marks=5, difficulty='medium'):
    q = Question.objects.create(
        exam=exam, question_type='mcq', title=title, 
        description=description, marks=marks, difficulty=difficulty
    )
    mcq = MCQQuestion.objects.create(question=q)
    for i, opt in enumerate(options):
        MCQOption.objects.create(
            mcq_question=mcq,
            option_text=opt['text'],
            is_correct=opt.get('is_correct', False),
            order=i
        )
    return q

def create_coding(exam, title, description, starter_code, solution_code, test_cases, language='python', marks=20, difficulty='hard'):
    q = Question.objects.create(
        exam=exam, question_type='coding', title=title,
        description=description, marks=marks, difficulty=difficulty
    )
    coding = CodingQuestion.objects.create(
        question=q, programming_language=language,
        starter_code=starter_code, solution_code=solution_code
    )
    for i, tc in enumerate(test_cases):
        TestCase.objects.create(
            coding_question=coding,
            input_data=tc['input'],
            expected_output=tc['output'],
            is_visible=tc.get('visible', True),
            order=i
        )
    return q

print("=" * 60)
print("SEEDING DATABASE")
print("=" * 60)

# ── Users ────────────────────────────────────────────────────────────
print("\n📦 Users:")
admin = ensure_user('admin', 'admin@sparkless.com', 'admin123', 'instructor',
                     'Professor', 'Smith', department='Computer Science', institution='SparkLess University')

student1 = ensure_user('student', 'student@sparkless.com', 'student123', 'student',
                        'Arka', 'Maulana', department='Computer Science', institution='SparkLess University')

student2 = ensure_user('sarah', 'sarah@sparkless.com', 'sarah123', 'student',
                        'Sarah', 'Chen', department='Computer Science', institution='SparkLess University')

student3 = ensure_user('james', 'james@sparkless.com', 'james123', 'student',
                        'James', 'Wilson', department='Biology', institution='SparkLess University')

student4 = ensure_user('maria', 'maria@sparkless.com', 'maria123', 'student',
                        'Maria', 'Garcia', department='Design', institution='SparkLess University')

student5 = ensure_user('alex', 'alex@sparkless.com', 'alex123', 'student',
                        'Alex', 'Johnson', department='Computer Science', institution='SparkLess University')

# ── Courses ──────────────────────────────────────────────────────────
print("\n📚 Courses:")
courses_data = [
    {
        'title': 'Python Programming Fundamentals',
        'description': 'Learn Python from scratch — variables, functions, OOP, file handling, and real-world projects.',
        'category': 'coding', 'difficulty': 'beginner', 'total_lessons': 15,
        'thumbnail': 'https://picsum.photos/seed/python/400/225',
    },
    {
        'title': 'Data Structures & Algorithms',
        'description': 'Master arrays, linked lists, trees, graphs, sorting, and dynamic programming.',
        'category': 'coding', 'difficulty': 'advanced', 'total_lessons': 20,
        'thumbnail': 'https://picsum.photos/seed/dsa/400/225',
    },
    {
        'title': 'Molecular Biology: Genetic Engineering',
        'description': 'Explore DNA, RNA, gene cloning, CRISPR, and modern genetic engineering techniques.',
        'category': 'science', 'difficulty': 'intermediate', 'total_lessons': 12,
        'thumbnail': 'https://picsum.photos/seed/bio/400/225',
    },
    {
        'title': 'UI/UX Design Principles',
        'description': 'Learn color theory, typography, accessibility, wireframing, and user research methods.',
        'category': 'design', 'difficulty': 'beginner', 'total_lessons': 10,
        'thumbnail': 'https://picsum.photos/seed/design/400/225',
    },
    {
        'title': 'Linear Algebra for Engineers',
        'description': 'Vectors, matrices, eigenvalues, and applications in machine learning and graphics.',
        'category': 'math', 'difficulty': 'intermediate', 'total_lessons': 14,
        'thumbnail': 'https://picsum.photos/seed/math/400/225',
    },
]

created_courses = []
for cd in courses_data:
    course, created = Course.objects.get_or_create(
        title=cd['title'],
        defaults={**cd, 'instructor': admin}
    )
    if not created:
        for k, v in cd.items():
            setattr(course, k, v)
        course.instructor = admin
        course.save()
    created_courses.append(course)
    print(f"  {'Created' if created else 'Updated'}: {course.title}")

# ── Course Enrollments ───────────────────────────────────────────────
print("\n🎓 Course Enrollments:")
enrollments_data = [
    (student1, created_courses[0], 12),   # Arka → Python (80%)
    (student1, created_courses[2], 8),    # Arka → Biology (67%)
    (student1, created_courses[3], 3),    # Arka → UI/UX (30%)
    (student2, created_courses[0], 15),   # Sarah → Python (100%)
    (student2, created_courses[1], 18),   # Sarah → DSA (90%)
    (student2, created_courses[4], 10),   # Sarah → Linear Algebra (71%)
    (student3, created_courses[2], 6),    # James → Biology (50%)
    (student4, created_courses[3], 9),    # Maria → UI/UX (90%)
    (student4, created_courses[0], 5),    # Maria → Python (33%)
    (student5, created_courses[1], 14),   # Alex → DSA (70%)
    (student5, created_courses[4], 12),   # Alex → Linear Algebra (86%)
]

for student, course, completed in enrollments_data:
    enrollment, created = CourseEnrollment.objects.get_or_create(
        student=student, course=course,
        defaults={'completed_lessons': completed}
    )
    if not created:
        enrollment.completed_lessons = completed
        enrollment.save()
    print(f"  {student.username} → {course.title} ({enrollment.progress}%)")

# ── Exams ────────────────────────────────────────────────────────────
print("\n📝 Exams:")
now = timezone.now()
exams_data = [
    {
        'title': 'Python Midterm Exam',
        'description': 'Covers variables, functions, loops, and basic OOP concepts.',
        'course_name': 'CS101: Python Programming',
        'course': created_courses[0],
        'start_time': now + timedelta(days=2),
        'end_time': now + timedelta(days=2, hours=2),
        'duration_minutes': 120,
        'status': 'published',
        'total_marks': 100,
        'passing_marks': 40,
    },
    {
        'title': 'DSA Final Exam',
        'description': 'Covers all data structures, graph algorithms, and dynamic programming.',
        'course_name': 'CS201: Data Structures & Algorithms',
        'course': created_courses[1],
        'start_time': now + timedelta(days=5),
        'end_time': now + timedelta(days=5, hours=3),
        'duration_minutes': 180,
        'status': 'published',
        'total_marks': 150,
        'passing_marks': 60,
    },
    {
        'title': 'Biology Lab Assessment',
        'description': 'Practical assessment on genetic engineering lab techniques.',
        'course_name': 'BIO301: Molecular Biology',
        'course': created_courses[2],
        'start_time': now + timedelta(days=8),
        'end_time': now + timedelta(days=8, hours=1, minutes=30),
        'duration_minutes': 90,
        'status': 'published',
        'total_marks': 50,
        'passing_marks': 20,
    },
    {
        'title': 'UI/UX Portfolio Review',
        'description': 'Submit and present your design portfolio for review.',
        'course_name': 'DES101: UI/UX Design',
        'course': created_courses[3],
        'start_time': now + timedelta(days=12),
        'end_time': now + timedelta(days=12, hours=1),
        'duration_minutes': 60,
        'status': 'published',
        'total_marks': 100,
        'passing_marks': 50,
    },
    {
        'title': 'Linear Algebra Quiz',
        'description': 'Quick quiz on matrix operations and eigenvalues.',
        'course_name': 'MATH201: Linear Algebra',
        'course': created_courses[4],
        'start_time': now + timedelta(days=1),
        'end_time': now + timedelta(days=1, minutes=45),
        'duration_minutes': 45,
        'status': 'published',
        'total_marks': 30,
        'passing_marks': 12,
    },
]

created_exams = []
for ed in exams_data:
    exam, created = Exam.objects.get_or_create(
        title=ed['title'],
        defaults={**ed, 'instructor': admin}
    )
    if not created:
        for k, v in ed.items():
            setattr(exam, k, v)
        exam.instructor = admin
        exam.save()
    created_exams.append(exam)
    print(f"  {'Created' if created else 'Updated'}: {exam.title} ({exam.status})")

# ── Questions ────────────────────────────────────────────────────────
print("\n❓ Questions:")
# Clear existing questions for reset seeding
Question.objects.filter(exam__in=created_exams).delete()

# Python Exam Questions
python_exam = created_exams[0]
create_mcq(python_exam, "Python Hooks", "Which of the following is NOT a React Hook (conceptually applied to Python)?", [
    {'text': 'useState', 'is_correct': False},
    {'text': 'useFetch', 'is_correct': True},
    {'text': 'useEffect', 'is_correct': False},
    {'text': 'useReducer', 'is_correct': False},
], marks=10, difficulty='easy')

create_mcq(python_exam, "Python Lists", "What is the output of `[1, 2, 3] * 2`?", [
    {'text': '[1, 2, 3, 1, 2, 3]', 'is_correct': True},
    {'text': '[2, 4, 6]', 'is_correct': False},
    {'text': 'Error', 'is_correct': False},
    {'text': '[1, 2, 3, 2]', 'is_correct': False},
], marks=10, difficulty='easy')

create_coding(python_exam, "Palindrome Checker", "Write a function `is_palindrome(s)` that returns True if s is a palindrome.",
    "def is_palindrome(s):\n    # Your code here\n    pass",
    "def is_palindrome(s):\n    return s == s[::-1]",
    [{'input': '"racecar"', 'output': 'True'}, {'input': '"hello"', 'output': 'False'}],
    marks=30, difficulty='medium')

# DSA Exam Questions
dsa_exam = created_exams[1]
create_mcq(dsa_exam, "Time Complexity", "What is the time complexity of binary search?", [
    {'text': 'O(n)', 'is_correct': False},
    {'text': 'O(n^2)', 'is_correct': False},
    {'text': 'O(log n)', 'is_correct': True},
    {'text': 'O(1)', 'is_correct': False},
], marks=10, difficulty='medium')

create_coding(dsa_exam, "Array Flattening", "Write a function to flatten a nested list.",
    "def flatten_list(nested):\n    # Your code here\n    pass",
    "def flatten_list(nested):\n    res = []\n    for i in nested:\n        if isinstance(i, list): res.extend(flatten_list(i))\n        else: res.append(i)\n    return res",
    [{'input': '[1, [2, [3, 4], 5], 6]', 'output': '[1, 2, 3, 4, 5, 6]'}],
    marks=40, difficulty='hard')

print("  Seeded questions for Python and DSA exams.")

# ── Exam Enrollments ─────────────────────────────────────────────────
print("\n📋 Exam Enrollments:")
exam_enrollments = [
    (student1, created_exams[0], 'enrolled', None, None),
    (student1, created_exams[2], 'enrolled', None, None),
    (student2, created_exams[0], 'enrolled', None, None),
    (student2, created_exams[1], 'enrolled', None, None),
    (student3, created_exams[2], 'enrolled', None, None),
    (student4, created_exams[3], 'enrolled', None, None),
    (student5, created_exams[1], 'enrolled', None, None),
    (student5, created_exams[4], 'enrolled', None, None),
]

for student, exam, exam_status, score, percentage in exam_enrollments:
    enrollment, created = ExamEnrollment.objects.get_or_create(
        student=student, exam=exam,
        defaults={'status': exam_status, 'score': score, 'percentage': percentage}
    )
    print(f"  {student.username} -> {exam.title} ({exam_status})")

# ── Seed Personalized Learning Path Agent Session ────────────────────
print("\n🤖 Personalized Learning Path Multi-Agent System:")
from exam_proctor_backend.apps.exams.agent_models import LearningAgentSession
from exam_proctor_backend.apps.exams.agent_services import execute_multi_agent_pipeline

if not LearningAgentSession.objects.filter(student=student1).exists():
    benchmark_question = "I passed my Algebra test with 82%, but I struggle with word problems and setting up equations."
    demo_session = execute_multi_agent_pipeline(student1, benchmark_question, "Algebra")
    print(f"  Seeded Multi-Agent Diagnostic Session for {student1.username}: {demo_session.subject} ({demo_session.symptom})")
else:
    print(f"  Multi-Agent Diagnostic Session already exists for {student1.username}.")

# ── Summary ──────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("SEED COMPLETE!")
print(f"  Users: {User.objects.count()}")
print(f"  Courses: {Course.objects.count()}")
print(f"  Course Enrollments: {CourseEnrollment.objects.count()}")
print(f"  Exams: {Exam.objects.count()}")
print(f"  Questions: {Question.objects.count()}")
print(f"  Exam Enrollments: {ExamEnrollment.objects.count()}")
print(f"  Learning Agent Sessions: {LearningAgentSession.objects.count()}")
print("=" * 60)
print("\nLogin Credentials:")
print("  Faculty: admin / admin123")
print("  Student: student / student123")
print("  Student: sarah / sarah123")
print("  Student: james / james123")
print("  Student: maria / maria123")
print("  Student: alex / alex123")
