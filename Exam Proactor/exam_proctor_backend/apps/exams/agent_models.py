from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class LearningAgentSession(models.Model):
    """Stores a student interaction session with the Personalized Learning Path Multi-Agent System."""
    STATUS_CHOICES = (
        ('analyzing', 'Analyzing'),
        ('diagnosed', 'Diagnosed'),
        ('pending_approval', 'Pending Teacher Approval'),
        ('approved', 'Approved by Teacher'),
        ('adopted', 'Adopted by Student'),
    )

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='learning_agent_sessions')
    subject = models.CharField(max_length=100, default='Algebra')
    symptom = models.CharField(max_length=255, default='Struggles with word problems despite passing test')
    raw_question = models.TextField(help_text="Student original query/question")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='analyzing')
    
    # Fast access summary fields
    overall_mastery_score = models.FloatField(default=0.0)
    gap_summary = models.TextField(blank=True, default='')
    recommended_path_title = models.CharField(max_length=255, blank=True, default='')
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'learning_agent_sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} - {self.subject} ({self.status})"


class AgentInteractionLog(models.Model):
    """Logs the discrete thought process, findings, and deliverables of each of the 5 agents."""
    AGENT_CHOICES = (
        ('student_interaction', 'Student Interaction Agent'),
        ('mastery_assessment', 'Mastery Assessment Agent'),
        ('gap_diagnosis', 'Gap Diagnosis Agent'),
        ('path_sequencing', 'Path Sequencing Agent'),
        ('teacher_notification', 'Teacher Notification Agent'),
    )

    session = models.ForeignKey(LearningAgentSession, on_delete=models.CASCADE, related_name='agent_logs')
    agent_name = models.CharField(max_length=40, choices=AGENT_CHOICES)
    step_number = models.IntegerField(default=1)
    title = models.CharField(max_length=255)
    summary = models.TextField()
    payload_json = models.TextField(default='{}', help_text="Structured JSON payload containing agent-specific artifacts")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'agent_interaction_logs'
        ordering = ['step_number', 'created_at']

    def __str__(self):
        return f"[{self.agent_name}] Session {self.session_id}: {self.title}"


class TeacherIntervention(models.Model):
    """Tracks alerts sent to faculty, instructor notes, and curriculum modification approvals."""
    APPROVAL_CHOICES = (
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('modified', 'Modified by Teacher'),
        ('mentorship_scheduled', '1-on-1 Mentorship Scheduled'),
        ('dismissed', 'Dismissed'),
    )
    SEVERITY_CHOICES = (
        ('info', 'Informational'),
        ('moderate', 'Moderate Gap Detected'),
        ('high', 'High Concept-Score Disparity'),
    )

    session = models.ForeignKey(LearningAgentSession, on_delete=models.CASCADE, related_name='teacher_interventions')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_interventions')
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_interventions')
    
    alert_title = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='high')
    approval_status = models.CharField(max_length=30, choices=APPROVAL_CHOICES, default='pending')
    
    dossier_summary = models.TextField(help_text="Detailed diagnosis compiled by Teacher Notification Agent")
    teacher_notes = models.TextField(blank=True, default='')
    reviewed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teacher_interventions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Alert: {self.student.username} - {self.alert_title} ({self.approval_status})"


class CodeRemediationItem(models.Model):
    """
    Stores targeted coding remediation track items for students:
    Identifies lagging concepts where student understood concepts in quiz
    but struggled in hands-on coding challenges.
    """
    STATUS_CHOICES = (
        ('needs_practice', 'Needs Practice'),
        ('in_progress', 'In Progress'),
        ('mastered', 'Mastered / Ready for Re-exam'),
    )

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='code_remediations')
    course_title = models.CharField(max_length=255, default='Python for Beginners')
    module_title = models.CharField(max_length=255, default='Variables & Control Flow')
    concept_name = models.CharField(max_length=255, help_text="e.g. Loop Iteration & Range Off-By-One Logic")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='needs_practice')
    quiz_score = models.IntegerField(default=85)
    challenge_score = models.IntegerField(default=30)
    diagnosis_reason = models.TextField(help_text="Explains why coding challenge failed despite good quiz score")
    starter_code = models.TextField(blank=True, default='')
    solution_code = models.TextField(blank=True, default='')
    practice_hint = models.TextField(blank=True, default='')
    test_cases_json = models.TextField(default='[]')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'code_remediation_items'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} - {self.concept_name} ({self.status})"

