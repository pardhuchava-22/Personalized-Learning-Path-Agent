from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Course(models.Model):
    """Course model for organizing exams and student learning."""
    DIFFICULTY_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    )
    CATEGORY_CHOICES = (
        ('coding', 'Coding'),
        ('science', 'Science'),
        ('design', 'Design'),
        ('math', 'Math'),
        ('general', 'General'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses_taught')
    thumbnail = models.URLField(blank=True, default='')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    total_lessons = models.IntegerField(default=10)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # YouTube and AI generation attributes
    youtube_video_id = models.CharField(max_length=50, blank=True, null=True)
    youtube_playlist_id = models.CharField(max_length=100, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    daily_learning_time_minutes = models.IntegerField(default=120, blank=True, null=True)
    learning_goal = models.TextField(blank=True, default='')
    advanced_options_json = models.TextField(blank=True, default='{}')
    total_duration_seconds = models.IntegerField(default=0, blank=True, null=True)
    video_count = models.IntegerField(default=1, blank=True, null=True)
    language = models.CharField(max_length=50, default='English', blank=True, null=True)
    channel_name = models.CharField(max_length=255, default='', blank=True, null=True)

    class Meta:
        db_table = 'courses'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def delete(self, *args, **kwargs):
        # 1. Delete associated Exams (which cascade-deletes related Questions, ExamEnrollments, Violations, Submissions, etc.)
        self.exams.all().delete()
        
        # 2. Delete CourseGenerationTasks (which cascade-deletes CourseGenerationSteps)
        from .models import CourseGenerationTask
        CourseGenerationTask.objects.filter(course_id=self.id).delete()

        # 3. Delete associated VideoTranscripts (to completely wipe all cached transcript data for the course modules)
        from .models import VideoTranscript
        video_ids = list(self.modules.values_list('source_video_id', flat=True))
        if self.youtube_video_id:
            video_ids.append(self.youtube_video_id)
        VideoTranscript.objects.filter(youtube_video_id__in=video_ids).delete()
        
        # 4. Call parent delete to cascade-delete related modules, progress, enrollments, etc.
        super().delete(*args, **kwargs)


class CourseEnrollment(models.Model):
    """Tracks student enrollment and progress in courses."""
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    completed_lessons = models.IntegerField(default=0)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_enrollments'
        unique_together = ('student', 'course')
        ordering = ['-last_accessed']

    def __str__(self):
        return f"{self.student.username} - {self.course.title}"

    @property
    def progress(self):
        if self.course.total_lessons == 0:
            return 0
        return round((self.completed_lessons / self.course.total_lessons) * 100)


class Exam(models.Model):
    """Exam model for storing exam configurations and metadata."""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('active', 'Active'),
        ('closed', 'Closed'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    course_name = models.CharField(max_length=255, blank=True, default='')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='exams')
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Exam Timing
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_minutes = models.IntegerField(help_text="Total exam duration in minutes")

    # Configuration
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    total_marks = models.FloatField(default=100)
    passing_marks = models.FloatField(default=40)
    negative_marking = models.FloatField(default=0)

    # Proctoring Settings
    enable_camera = models.BooleanField(default=True)
    enable_mic = models.BooleanField(default=True)
    enable_screenshot = models.BooleanField(default=True)
    record_screen = models.BooleanField(default=True)
    record_video = models.BooleanField(default=True)
    fullscreen_required = models.BooleanField(default=True)
    tab_switch_allowed = models.BooleanField(default=False)

    # Violation Settings
    violation_threshold = models.IntegerField(default=3)
    score_reduction_per_violation = models.FloatField(default=10)

    # Additional settings
    allow_multiple_attempts = models.BooleanField(default=False)
    show_answers_after_exam = models.BooleanField(default=True)
    shuffle_questions = models.BooleanField(default=True)
    shuffle_options = models.BooleanField(default=True)

    class Meta:
        db_table = 'exams'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['instructor']),
            models.Index(fields=['status']),
            models.Index(fields=['start_time']),
        ]

    def __str__(self):
        return self.title

    @property
    def is_active(self):
        now = timezone.now()
        return self.start_time <= now <= self.end_time

    @property
    def is_upcoming(self):
        return timezone.now() < self.start_time

    @property
    def is_closed(self):
        return timezone.now() > self.end_time


class ExamEnrollment(models.Model):
    """Model to track student enrollment in exams."""
    STATUS_CHOICES = (
        ('enrolled', 'Enrolled'),
        ('started', 'Started'),
        ('submitted', 'Submitted'),
        ('completed', 'Completed'),
        ('withdrawn', 'Withdrawn'),
    )

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='enrollments')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exam_enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enrolled')

    enrolled_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(blank=True, null=True)
    submitted_at = models.DateTimeField(blank=True, null=True)

    score = models.FloatField(blank=True, null=True)
    percentage = models.FloatField(blank=True, null=True)
    result = models.CharField(max_length=10, choices=[('pass', 'Pass'), ('fail', 'Fail')], blank=True, null=True)

    total_violations = models.IntegerField(default=0)
    final_violations = models.IntegerField(default=0)
    score_reduction = models.FloatField(default=0)
    is_blocked = models.BooleanField(default=False)
    is_auto_submitted = models.BooleanField(default=False)
    time_taken_seconds = models.IntegerField(default=0, help_text="Total time taken by student in seconds")
    integrity_score = models.FloatField(default=100.0, help_text="Calculated integrity score based on violations")

    class Meta:
        db_table = 'exam_enrollments'
        unique_together = ('exam', 'student')
        ordering = ['-enrolled_at']
        indexes = [
            models.Index(fields=['exam', 'student']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.student.username} - {self.exam.title}"

    @property
    def is_submitted(self):
        return self.status == 'submitted'


class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    video_url = models.CharField(max_length=255, blank=True, null=True)
    order = models.IntegerField(default=0)
    estimated_minutes = models.IntegerField(default=60, blank=True, null=True)
    learning_day = models.IntegerField(default=1, blank=True, null=True)
    scheduled_date = models.DateField(blank=True, null=True)
    scheduled_time = models.CharField(max_length=20, blank=True, null=True)
    watch_start_seconds = models.IntegerField(default=0, blank=True, null=True)
    watch_end_seconds = models.IntegerField(default=0, blank=True, null=True)
    source_video_id = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'modules'
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class VideoTimestamp(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='timestamps')
    timestamp_seconds = models.IntegerField()
    label = models.CharField(max_length=255)

    class Meta:
        db_table = 'video_timestamps'
        ordering = ['timestamp_seconds']


class VideoProgress(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='video_progress_records')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='video_progress_records')
    watch_time_seconds = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = 'video_progress'
        unique_together = ('student', 'module')


class Bookmark(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarks')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='bookmarks')
    timestamp_seconds = models.IntegerField()
    description = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'bookmarks'


class Note(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='notes')
    timestamp_seconds = models.IntegerField(blank=True, null=True)
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'notes'
        ordering = ['created_at']


class Quiz(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=255)
    passing_score = models.IntegerField(default=70)

    class Meta:
        db_table = 'quizzes'


class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    options_json = models.TextField(help_text="JSON serialized array of choice items")
    correct_option_index = models.IntegerField()

    class Meta:
        db_table = 'quiz_questions'


class QuizAttempt(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    score_percentage = models.FloatField()
    is_passed = models.BooleanField()
    completed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'quiz_attempts'


class CodingChallenge(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='coding_challenges')
    title = models.CharField(max_length=255)
    instructions = models.TextField()
    starter_code = models.TextField()
    solution_code = models.TextField()
    programming_language = models.CharField(max_length=50, default='python')
    test_cases_json = models.TextField(default='[]')

    class Meta:
        db_table = 'coding_challenges'


class ChallengeSubmission(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenge_submissions')
    challenge = models.ForeignKey(CodingChallenge, on_delete=models.CASCADE, related_name='submissions')
    submitted_code = models.TextField()
    is_passed = models.BooleanField(default=False)
    feedback = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'challenge_submissions'


class RevisionSession(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='revision_sessions')
    scheduled_time = models.DateTimeField()
    is_completed = models.BooleanField(default=False)
    meeting_link = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'revision_sessions'


class FinalExam(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='final_exams')
    exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, blank=True, null=True, related_name='course_final_exams')
    is_mandatory = models.BooleanField(default=True)

    class Meta:
        db_table = 'final_exams'


class ProctoringLog(models.Model):
    final_exam = models.ForeignKey(FinalExam, on_delete=models.CASCADE, related_name='proctor_logs')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proctor_logs')
    violation_count = models.IntegerField(default=0)
    is_flagged = models.BooleanField(default=False)
    log_details = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'proctoring_logs'


class CourseProgress(models.Model):
    enrollment = models.ForeignKey(CourseEnrollment, on_delete=models.CASCADE, related_name='progress_details')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='progress_records')
    progress_percentage = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='not_started')

    class Meta:
        db_table = 'course_progress'


class VideoTranscript(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, blank=True, null=True, related_name='transcripts')
    youtube_url = models.CharField(max_length=255)
    youtube_video_id = models.CharField(max_length=50, blank=True, null=True)
    full_transcript = models.TextField()
    processed_chunks_json = models.TextField(blank=True, null=True)
    cached_topics_json = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'video_transcripts'


class CourseGenerationTask(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_generation_tasks')
    youtube_url = models.TextField()
    status = models.CharField(max_length=20, default='pending')
    progress = models.IntegerField(default=0)
    current_step = models.CharField(max_length=100, default='Initializing...')
    course_id = models.IntegerField(blank=True, null=True)
    request_payload_json = models.TextField(blank=True, default='{}')
    daily_learning_time_minutes = models.IntegerField(default=120, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    goals = models.TextField(blank=True, default='')
    advanced_options_json = models.TextField(blank=True, default='{}')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'course_generation_tasks'


class CourseGenerationStep(models.Model):
    task = models.ForeignKey(CourseGenerationTask, on_delete=models.CASCADE, related_name='steps')
    step_name = models.CharField(max_length=50)
    status = models.CharField(max_length=20, default='pending')
    progress = models.IntegerField(default=0)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    retry_count = models.IntegerField(default=0)
    cached_output = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'course_generation_steps'


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='course_notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=50, default='general')
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'notifications'


# Import Multi-Agent Learning Path Models
from .agent_models import LearningAgentSession, AgentInteractionLog, TeacherIntervention, CodeRemediationItem
