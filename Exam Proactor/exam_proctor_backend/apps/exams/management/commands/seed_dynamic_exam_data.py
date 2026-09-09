from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from exam_proctor_backend.apps.exams.models import Exam, ExamEnrollment
from exam_proctor_backend.apps.questions.models import Question, MCQQuestion, MCQOption
from exam_proctor_backend.apps.submissions.models import QuestionSubmission, MCQSubmission

User = get_user_model()

EXAM_CONFIGS = [
    {
        "id": 1,
        "title": "Python Programming Midterm",
        "course_name": "CS201: Advanced Python & Systems",
        "total_marks": 100,
        "passing_marks": 50,
        "sections": [
            {
                "difficulty": "easy",
                "topics": [
                    ("Variables & Primitive Datatypes", "Which of the following is an immutable sequence in Python?", ["list", "tuple", "set", "bytearray"], 1),
                    ("List & Dict Comprehensions", "What is the output of [x**2 for x in range(4)]?", ["[0, 1, 4, 9]", "[1, 4, 9, 16]", "[0, 1, 2, 3]", "Generator object"], 0),
                    ("String Slicing & Formatting", "What does s[::-1] do on a string s?", ["Removes vowels", "Reverses the string", "Converts to uppercase", "Throws IndexError"], 1),
                    ("Built-in Math & Itertools", "Which function returns both index and item during iteration?", ["zip()", "map()", "enumerate()", "filter()"], 2),
                    ("Basic Control Flow", "What does the 'pass' keyword do in Python?", ["Exits the loop", "Acts as a syntactic placeholder", "Skips next iteration", "Raises exception"], 1),
                ],
                "student_correct_ratio": 1.0
            },
            {
                "difficulty": "medium",
                "topics": [
                    ("Functions & Closures", "What is a closure in Python?", ["A function object that remembers values in enclosing scopes", "A syntax error in indentation", "A function that terminates a thread", "A compiled C extension"], 0),
                    ("Class Inheritance & MRO", "How is Method Resolution Order determined in Python 3?", ["Depth-First Search", "C3 Linearization algorithm", "Alphabetical order", "Order of instantiation"], 1),
                    ("Generators & Yield Semantics", "What does 'yield from' accomplish?", ["Stops a generator", "Delegates to a subgenerator", "Converts generator to list", "Yields None"], 1),
                    ("Context Managers & Decorators", "Which dunder methods implement the context manager protocol?", ["__enter__ and __exit__", "__init__ and __del__", "__get__ and __set__", "__iter__ and __next__"], 0),
                    ("Exception Hierarchy", "What is the base class for all built-in exceptions that non-system-exiting exceptions inherit from?", ["BaseException", "Exception", "StandardError", "SystemError"], 1),
                ],
                "student_correct_ratio": 0.8
            },
            {
                "difficulty": "hard",
                "topics": [
                    ("Recursion Depth & Tail Elimination", "How does Python handle tail-call recursion optimization?", ["It optimizes automatically at runtime", "It does NOT optimize tail calls and enforces recursion limit", "It uses the @tail_rec decorator", "It translates to a while loop in bytecode"], 1),
                    ("GIL Contention in Multithreading", "Why does CPU-bound multithreading in CPython not scale across multiple physical cores?", ["Thread scheduling overhead", "Global Interpreter Lock (GIL) serializes bytecode execution", "OS kernel lock contention", "Cache coherence invalidation"], 1),
                    ("Memory Layout & Garbage Collection", "How does CPython detect cyclic references that reference counting misses?", ["Mark and sweep generational cycler", "Stop-the-world compacting GC", "Thread-local arena sweeps", "Reference counting never misses cycles"], 0),
                    ("Metaclasses & Class Creation Protocol", "Which method allocates the class instance in a metaclass before __init__ is called?", ["__call__", "__new__", "__prepare__", "__build__"], 1),
                    ("Time Complexity Bottlenecks in Dynamic Structures", "What is the worst-case amortized cost of inserting into an already full Python list?", ["O(N) memory copy during overallocation growth", "O(1) always", "O(log N) tree balancing", "O(N^2) memory reallocation"], 0),
                ],
                "student_correct_ratio": 0.2
            }
        ]
    },
    {
        "id": 2,
        "title": "Data Structures & Algorithms Final Exam",
        "course_name": "CS301: Algorithms & Complexity",
        "total_marks": 100,
        "passing_marks": 50,
        "sections": [
            {
                "difficulty": "easy",
                "topics": [
                    ("Array Indexing & Pointers", "What is the time complexity to access an element by index in a contiguous array?", ["O(1)", "O(N)", "O(log N)", "O(N^2)"], 0),
                    ("Stack LIFO Operations", "Which operation removes the top item from a stack?", ["Enqueue", "Pop", "Shift", "Dequeue"], 1),
                    ("Queue FIFO Mechanics", "Which data structure follows First-In, First-Out semantics?", ["Queue", "Stack", "Priority Queue", "Binary Search Tree"], 0),
                    ("Singly Linked List Traversal", "What is the time complexity to search for a key in an unsorted linked list?", ["O(1)", "O(N)", "O(log N)", "O(N log N)"], 1),
                ],
                "student_correct_ratio": 1.0
            },
            {
                "difficulty": "medium",
                "topics": [
                    ("Binary Search Tree Invariants", "In a BST, where are elements smaller than the root node stored?", ["Right subtree", "Left subtree", "Leaf nodes only", "Random order"], 1),
                    ("Merge Sort Recurrence", "What is the standard recurrence relation for Merge Sort?", ["T(N) = 2T(N/2) + O(N)", "T(N) = T(N-1) + O(1)", "T(N) = 2T(N/2) + O(1)", "T(N) = T(N/2) + O(N)"], 0),
                    ("Heap Order Invariant", "In a min-heap, which element is guaranteed to be at index 0?", ["The maximum element", "The minimum element", "The median element", "The last inserted element"], 1),
                    ("Hash Collision Resolution", "Which collision resolution technique stores collisions in linked lists at each bucket?", ["Linear Probing", "Separate Chaining", "Quadratic Probing", "Double Hashing"], 1),
                ],
                "student_correct_ratio": 0.75
            },
            {
                "difficulty": "hard",
                "topics": [
                    ("Recursive Decomposition & State Ledgers", "When flattening deeply nested structures recursively, what causes stack overflow?", ["Heap memory exhaustion", "Exceeding call stack frame allocation limit without tail elimination", "Reference cycle deadlock", "Variable shadowing"], 1),
                    ("Dynamic Programming State Formulation", "What two properties must a problem have for DP to be applicable?", ["Greedy choice and linearity", "Optimal substructure and overlapping subproblems", "Divide and conquer with disjoint subproblems", "Recursion and sorting"], 1),
                    ("Graph Topological Sorting", "Which algorithm performs topological sorting in O(V + E) on a DAG?", ["Dijkstra's Algorithm", "Kahn's Algorithm (in-degree BFS) or DFS post-order", "Prim's Algorithm", "Bellman-Ford"], 1),
                    ("Amortized Analysis of Disjoint Sets", "What is the nearly linear amortized time complexity of Union-Find with path compression and rank?", ["O(N log N)", "O(alpha(N)) where alpha is inverse Ackermann", "O(N)", "O(1) strictly"], 1),
                ],
                "student_correct_ratio": 0.25
            }
        ]
    },
    {
        "id": 5,
        "title": "Linear Algebra Quiz",
        "course_name": "MATH202: Linear Algebra & Matrix Systems",
        "total_marks": 100,
        "passing_marks": 40,
        "sections": [
            {
                "difficulty": "easy",
                "topics": [
                    ("Vector Addition & Dot Products", "What is the dot product of [1, 2] and [3, 4]?", ["7", "11", "14", "10"], 1),
                    ("Matrix Dimension Rules", "Can an m x n matrix multiply an n x p matrix?", ["Yes, resulting in m x p", "No, dimensions must be identical", "Only if m = p", "Only if n is even"], 0),
                    ("Identity Matrix Properties", "Multiplying any square matrix A by identity matrix I produces:", ["A", "I", "Zero matrix", "Transpose of A"], 0),
                ],
                "student_correct_ratio": 1.0
            },
            {
                "difficulty": "medium",
                "topics": [
                    ("Gaussian Elimination & RREF", "What operation is NOT an elementary row operation?", ["Multiplying a row by non-zero scalar", "Adding scalar multiple of a row to another", "Squaring all elements of a row", "Swapping two rows"], 2),
                    ("Determinants & Invertibility", "A square matrix is invertible if and only if its determinant is:", ["Zero", "Non-zero", "Positive", "Equal to 1"], 1),
                    ("Rank-Nullity Theorem", "For matrix A (m x n), Rank(A) + Nullity(A) equals:", ["m", "n", "m * n", "min(m, n)"], 1),
                ],
                "student_correct_ratio": 0.67
            },
            {
                "difficulty": "hard",
                "topics": [
                    ("Eigenvalues & Characteristic Polynomials", "How do you find eigenvalues lambda of matrix A?", ["Solve det(A - lambda * I) = 0", "Calculate trace(A) / det(A)", "Multiply A by its inverse", "Compute row echelon form"], 0),
                    ("Orthogonal Projections & Gram-Schmidt", "What is the projection of vector v onto subspace W when W is spanned by orthonormal basis {u1, u2}?", ["(v . u1)u1 + (v . u2)u2", "v - (u1 + u2)", "det(W) * v", "u1 x u2"], 0),
                    ("Contextual Modeling with Transformation Matrices", "What is the transformation matrix for a 90-degree counterclockwise rotation in 2D?", ["[[-1, 0], [0, -1]]", "[[0, -1], [1, 0]]", "[[1, 0], [0, 1]]", "[[0, 1], [-1, 0]]"], 1),
                ],
                "student_correct_ratio": 0.33
            }
        ]
    }
]

class Command(BaseCommand):
    help = 'Seeds dynamic exam questions and student submissions for all catalog exams.'

    def handle(self, *args, **options):
        student = User.objects.filter(username='student').first() or User.objects.first()
        instructor = User.objects.filter(role='faculty').first() or User.objects.first()

        self.stdout.write(self.style.SUCCESS(f"Seeding dynamic exams for student '{student.username}' and instructor '{instructor.username}'..."))

        for cfg in EXAM_CONFIGS:
            exam, created = Exam.objects.get_or_create(
                id=cfg['id'],
                defaults={
                    'title': cfg['title'],
                    'course_name': cfg['course_name'],
                    'instructor': instructor,
                    'status': 'published',
                    'start_time': timezone.now() - timezone.timedelta(days=2),
                    'end_time': timezone.now() + timezone.timedelta(days=10),
                    'duration_minutes': 60,
                    'total_marks': cfg['total_marks'],
                    'passing_marks': cfg['passing_marks']
                }
            )
            if not created:
                exam.title = cfg['title']
                exam.course_name = cfg['course_name']
                exam.status = 'published'
                exam.save()

            exam.questions.all().delete()

            order = 1
            total_q = 0
            correct_q = 0
            all_qs_and_correct = []

            for sec in cfg['sections']:
                diff = sec['difficulty']
                topics = sec['topics']
                ratio = sec['student_correct_ratio']
                target_correct = round(len(topics) * ratio)

                for idx, (top_name, q_text, opts, corr_idx) in enumerate(topics):
                    q = Question.objects.create(
                        exam=exam,
                        question_type='mcq',
                        difficulty=diff,
                        title=top_name,
                        description=q_text,
                        marks=5.0,
                        order=order
                    )
                    mcq = MCQQuestion.objects.create(question=q)
                    correct_opt_obj = None
                    wrong_opt_obj = None
                    for o_idx, opt_text in enumerate(opts):
                        is_c = (o_idx == corr_idx)
                        opt_obj = MCQOption.objects.create(
                            mcq_question=mcq,
                            option_text=opt_text,
                            is_correct=is_c,
                            order=o_idx
                        )
                        if is_c:
                            correct_opt_obj = opt_obj
                        elif wrong_opt_obj is None:
                            wrong_opt_obj = opt_obj

                    is_student_correct = (idx < target_correct)
                    all_qs_and_correct.append((q, is_student_correct, correct_opt_obj, wrong_opt_obj))
                    order += 1
                    total_q += 1
                    if is_student_correct:
                        correct_q += 1

            overall_pct = round((correct_q / total_q) * 100) if total_q > 0 else 75
            en, _ = ExamEnrollment.objects.get_or_create(
                exam=exam,
                student=student,
                defaults={
                    'status': 'submitted',
                    'score': round(overall_pct),
                    'percentage': overall_pct,
                    'result': 'pass' if overall_pct >= cfg['passing_marks'] else 'fail',
                    'submitted_at': timezone.now() - timezone.timedelta(days=1),
                    'time_taken_seconds': 2100
                }
            )
            en.status = 'submitted'
            en.score = overall_pct
            en.percentage = overall_pct
            en.result = 'pass' if overall_pct >= cfg['passing_marks'] else 'fail'
            en.time_taken_seconds = 2100
            en.save()

            en.submissions.all().delete()

            for q, is_c, c_opt, w_opt in all_qs_and_correct:
                sub = QuestionSubmission.objects.create(
                    enrollment=en,
                    question=q,
                    status='submitted',
                    marks_obtained=q.marks if is_c else 0,
                    is_correct=is_c
                )
                MCQSubmission.objects.create(
                    submission=sub,
                    selected_option=c_opt if is_c else w_opt
                )

            self.stdout.write(self.style.SUCCESS(
                f"  [OK] Exam '{exam.title}' seeded: {total_q} questions, student score: {overall_pct}% ({correct_q}/{total_q} correct)"
            ))

        self.stdout.write(self.style.SUCCESS("All catalog exams successfully seeded with real questions and submissions!"))
