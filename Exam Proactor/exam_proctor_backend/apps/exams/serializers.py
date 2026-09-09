from rest_framework import serializers
from exam_proctor_backend.apps.exams.models import Exam, ExamEnrollment, Course, CourseEnrollment


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.get_full_name', read_only=True)
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'instructor', 'instructor_name',
            'thumbnail', 'difficulty', 'category', 'total_lessons',
            'is_published', 'created_at', 'enrolled_count'
        ]
        read_only_fields = ['id', 'created_at']

    def get_enrolled_count(self, obj):
        return obj.enrollments.count()


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_category = serializers.CharField(source='course.category', read_only=True)
    course_difficulty = serializers.CharField(source='course.difficulty', read_only=True)
    course_thumbnail = serializers.URLField(source='course.thumbnail', read_only=True)
    course_total_lessons = serializers.IntegerField(source='course.total_lessons', read_only=True)
    instructor_name = serializers.CharField(source='course.instructor.get_full_name', read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = CourseEnrollment
        fields = [
            'id', 'student', 'course', 'course_title', 'course_category',
            'course_difficulty', 'course_thumbnail', 'course_total_lessons',
            'instructor_name', 'completed_lessons', 'progress',
            'enrolled_at', 'last_accessed'
        ]
        read_only_fields = ['id', 'enrolled_at', 'last_accessed']

    def get_progress(self, obj):
        return obj.progress


class ExamSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.get_full_name', read_only=True)
    is_active = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'description', 'course_name', 'course',
            'instructor', 'instructor_name',
            'start_time', 'end_time', 'duration_minutes', 'status',
            'total_marks', 'passing_marks', 'negative_marking',
            'enable_camera', 'enable_mic', 'enable_screenshot', 'record_screen',
            'record_video', 'fullscreen_required', 'tab_switch_allowed',
            'violation_threshold', 'score_reduction_per_violation',
            'allow_multiple_attempts', 'show_answers_after_exam',
            'shuffle_questions', 'shuffle_options', 'is_active',
            'created_at', 'updated_at', 'enrolled_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'instructor']

    def get_is_active(self, obj):
        return obj.is_active

    def get_enrolled_count(self, obj):
        return obj.enrollments.count()


class ExamListSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.get_full_name', read_only=True)
    question_count = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()
    enrollment_id = serializers.SerializerMethodField()
    enrollment_status = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'title', 'description', 'course_name', 'instructor_name',
            'start_time', 'end_time', 'duration_minutes', 'status',
            'total_marks', 'passing_marks', 'created_at', 'question_count',
            'enrolled_count', 'enrollment_id', 'enrollment_status'
        ]
        read_only_fields = ['id', 'created_at']

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_enrolled_count(self, obj):
        return obj.enrollments.count()

    def get_enrollment_id(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            enrollment = obj.enrollments.filter(student=request.user).first()
            return enrollment.id if enrollment else None
        return None

    def get_enrollment_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            enrollment = obj.enrollments.filter(student=request.user).first()
            return enrollment.status if enrollment else None
        return None


class ExamEnrollmentSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)

    class Meta:
        model = ExamEnrollment
        fields = [
            'id', 'exam', 'exam_title', 'student', 'student_name',
            'student_email', 'student_username',
            'status', 'enrolled_at', 'started_at', 'submitted_at',
            'score', 'percentage', 'result', 'total_violations',
            'final_violations', 'score_reduction', 'time_taken_seconds',
            'is_blocked', 'is_auto_submitted'
        ]
        read_only_fields = ['id', 'enrolled_at', 'score', 'percentage', 'result']
