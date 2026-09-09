"""Management command to create sample exam data."""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from exam_proctor_backend.apps.exams.models import Exam
from datetime import datetime, timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample exam data for testing'

    def handle(self, *args, **options):
        # Create instructor user
        instructor, created = User.objects.get_or_create(
            username='instructor1',
            defaults={
                'email': 'instructor@test.com',
                'first_name': 'John',
                'last_name': 'Instructor',
                'role': 'instructor',
                'is_staff': True,
            }
        )
        if created:
            instructor.set_password('password123')
            instructor.save()
            self.stdout.write(f'Created instructor: {instructor.username}')

        # Create student user
        student, created = User.objects.get_or_create(
            username='student1',
            defaults={
                'email': 'student@test.com',
                'first_name': 'Jane',
                'last_name': 'Student',
                'role': 'student',
            }
        )
        if created:
            student.set_password('password123')
            student.save()
            self.stdout.write(f'Created student: {student.username}')

        # Create sample exam
        now = datetime.now()
        exam, created = Exam.objects.get_or_create(
            title='Python Fundamentals',
            instructor=instructor,
            defaults={
                'description': 'Basic Python programming concepts',
                'start_time': now + timedelta(hours=1),
                'end_time': now + timedelta(hours=2),
                'duration_minutes': 60,
                'status': 'published',
                'total_marks': 100,
                'passing_marks': 40,
                'negative_marking': 0,
                'enable_camera': True,
                'enable_mic': True,
                'violation_threshold': 3,
            }
        )
        if created:
            self.stdout.write(f'Created exam: {exam.title}')

        self.stdout.write(self.style.SUCCESS('Sample data created successfully!'))
