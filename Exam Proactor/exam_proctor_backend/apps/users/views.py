from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from .serializers import UserSerializer, UserRegistrationSerializer, UserProfileSerializer
from exam_proctor_backend.apps.exams.models import ExamEnrollment, CourseEnrollment

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        elif self.action in ('retrieve', 'update'):
            return UserProfileSerializer
        return UserSerializer

    @action(detail=False, methods=['get', 'patch', 'put'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        """Get or update current user profile."""
        user = request.user
        if request.method in ['PATCH', 'PUT']:
            name = request.data.get('name')
            first_name = request.data.get('first_name')
            last_name = request.data.get('last_name')
            email = request.data.get('email')
            department = request.data.get('department')
            phone = request.data.get('phone')

            if name and not first_name:
                parts = name.strip().split(' ', 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ''

            if first_name is not None:
                user.first_name = first_name
            if last_name is not None:
                user.last_name = last_name
            if email:
                user.email = email
            if department is not None:
                user.department = department
            if phone is not None:
                user.phone = phone
            user.save()
            serializer = UserProfileSerializer(user)
            return Response(serializer.data)

        serializer = UserProfileSerializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Change current user's password."""
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'error': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if old_password and not user.check_password(old_password):
            return Response({'error': 'Current password does not match.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully!'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        """Reset a student's password — faculty/admin only."""
        if request.user.role not in ('instructor', 'admin'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()
        new_password = request.data.get('password')
        
        if not new_password:
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': f'Password for {user.username} has been reset successfully.'})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def students(self, request):
        """List all students — for faculty/admin Student Management."""
        if request.user.role not in ('instructor', 'admin'):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        students = User.objects.filter(role='student').order_by('-date_joined')
        result = []
        for student in students:
            # Get exam enrollments for performance data
            enrollments = ExamEnrollment.objects.filter(student=student)
            avg_val = enrollments.filter(percentage__isnull=False).aggregate(
                avg=Avg('percentage')
            )['avg']
            avg_score = avg_val if avg_val is not None else 0

            # Get course enrollments
            course_enrollments = CourseEnrollment.objects.filter(student=student).select_related('course')
            courses = [ce.course.title for ce in course_enrollments]

            # Determine grade from average score
            if avg_score >= 93: grade = 'A'
            elif avg_score >= 90: grade = 'A-'
            elif avg_score >= 87: grade = 'B+'
            elif avg_score >= 83: grade = 'B'
            elif avg_score >= 80: grade = 'B-'
            elif avg_score >= 77: grade = 'C+'
            elif avg_score >= 73: grade = 'C'
            elif avg_score >= 60: grade = 'D'
            elif avg_score > 0: grade = 'F'
            else: grade = '-'

            result.append({
                'id': str(student.id),
                'username': student.username,
                'name': f"{student.first_name} {student.last_name}".strip() or student.username,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'email': student.email,
                'status': 'Inactive' if not student.is_active else 'Active',
                'courses': courses,
                'performance': round(avg_score),
                'grade': grade,
                'lastActive': student.last_login.strftime('%b %d, %Y') if student.last_login else 'Never',
                'enrollmentDate': student.date_joined.strftime('%Y-%m-%d') if student.date_joined else '',
                'avatar': f'https://ui-avatars.com/api/?name={student.username}&background=random',
            })

        return Response(result)
