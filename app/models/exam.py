from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, UniqueConstraint, Index
from sqlalchemy.orm import relationship
import datetime
from app.database.db import Base

class Exam(Base):
    __tablename__ = 'exams'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, default='', nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    status = Column(String(20), default='draft', nullable=False)
    total_marks = Column(Float, default=100.0, nullable=False)
    passing_marks = Column(Float, default=40.0, nullable=False)
    negative_marking = Column(Float, default=0.0, nullable=False)
    enable_camera = Column(Boolean, default=True, nullable=False)
    enable_mic = Column(Boolean, default=True, nullable=False)
    enable_screenshot = Column(Boolean, default=True, nullable=False)
    record_screen = Column(Boolean, default=True, nullable=False)
    record_video = Column(Boolean, default=True, nullable=False)
    fullscreen_required = Column(Boolean, default=True, nullable=False)
    tab_switch_allowed = Column(Boolean, default=False, nullable=False)
    violation_threshold = Column(Integer, default=3, nullable=False)
    score_reduction_per_violation = Column(Float, default=10.0, nullable=False)
    allow_multiple_attempts = Column(Boolean, default=False, nullable=False)
    show_answers_after_exam = Column(Boolean, default=True, nullable=False)
    shuffle_questions = Column(Boolean, default=True, nullable=False)
    shuffle_options = Column(Boolean, default=True, nullable=False)
    instructor_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    course_name = Column(String(255), default='', nullable=False)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='SET NULL'), nullable=True)
    
    # Relationships
    course = relationship("Course", back_populates="exams")
    enrollments = relationship("ExamEnrollment", back_populates="exam", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")


class ExamEnrollment(Base):
    __tablename__ = 'exam_enrollments'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    status = Column(String(20), default='enrolled', nullable=False)
    enrolled_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    result = Column(String(10), nullable=True)
    total_violations = Column(Integer, default=0, nullable=False)
    final_violations = Column(Integer, default=0, nullable=False)
    score_reduction = Column(Float, default=0.0, nullable=False)
    exam_id = Column(Integer, ForeignKey('exams.id', ondelete='CASCADE'), nullable=False)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    time_taken_seconds = Column(Integer, default=0, nullable=False)
    is_auto_submitted = Column(Boolean, default=False, nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)
    integrity_score = Column(Float, default=100.0, nullable=False)
    
    # Unique constraints
    __table_args__ = (UniqueConstraint('exam_id', 'student_id', name='exam_enrollments_exam_id_student_id_uniq'),)
    
    # Relationships
    exam = relationship("Exam", back_populates="enrollments")
    student = relationship("User", back_populates="exam_enrollments")
    violations = relationship("ProctoringViolation", back_populates="enrollment", cascade="all, delete-orphan")
    session = relationship("ExamSession", back_populates="enrollment", uselist=False, cascade="all, delete-orphan")
    submissions = relationship("QuestionSubmission", back_populates="enrollment", cascade="all, delete-orphan")


class ProctoringViolation(Base):
    __tablename__ = 'proctoring_violations'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    violation_type = Column(String(50), nullable=False)
    description = Column(Text, default='', nullable=False)
    severity = Column(String(10), default='medium', nullable=False)
    evidence_video_frame = Column(String(100), nullable=True)
    evidence_screenshot = Column(String(100), nullable=True)
    detections = Column(Text, default='{}', nullable=False, comment="JSON representation of object detections")
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    reviewed = Column(Boolean, default=False, nullable=False)
    reviewer_notes = Column(Text, default='', nullable=False)
    enrollment_id = Column(Integer, ForeignKey('exam_enrollments.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    enrollment = relationship("ExamEnrollment", back_populates="violations")


class ExamSession(Base):
    __tablename__ = 'exam_sessions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    status = Column(String(20), default='active', nullable=False)
    screen_recording_path = Column(String(100), nullable=True)
    video_recording_path = Column(String(100), nullable=True)
    audio_recording_path = Column(String(100), nullable=True)
    camera_enabled = Column(Boolean, default=True, nullable=False)
    mic_enabled = Column(Boolean, default=True, nullable=False)
    session_start = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    session_end = Column(DateTime, nullable=True)
    total_session_duration_seconds = Column(Integer, default=0, nullable=False)
    total_violations = Column(Integer, default=0, nullable=False)
    total_screenshots = Column(Integer, default=0, nullable=False)
    fps_average = Column(Float, default=0.0, nullable=False)
    connection_quality = Column(String(20), default='good', nullable=False)
    ip_address = Column(String(39), nullable=True)
    user_agent = Column(Text, default='', nullable=False)
    device_info = Column(Text, default='{}', nullable=False, comment="JSON device metadata")
    enrollment_id = Column(Integer, ForeignKey('exam_enrollments.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Relationships
    enrollment = relationship("ExamEnrollment", back_populates="session")
    activities = relationship("ActivityLog", back_populates="session", cascade="all, delete-orphan")
    screen_captures = relationship("ScreenCapture", back_populates="session", cascade="all, delete-orphan")


class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    activity_type = Column(String(50), nullable=False)
    description = Column(Text, default='', nullable=False)
    # Using 'meta_data' to avoid attribute name clashing with reserved Declarative 'metadata' keyword
    meta_data = Column('metadata', Text, default='{}', nullable=False, comment="JSON metrics")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    session_id = Column(Integer, ForeignKey('exam_sessions.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    session = relationship("ExamSession", back_populates="activities")


class ScreenCapture(Base):
    __tablename__ = 'screen_captures'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    image = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    reason = Column(String(100), default='random', nullable=False)
    flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(Text, default='', nullable=False)
    session_id = Column(Integer, ForeignKey('exam_sessions.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    session = relationship("ExamSession", back_populates="screen_captures")


class Question(Base):
    __tablename__ = 'questions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    question_type = Column(String(20), nullable=False)
    difficulty = Column(String(10), default='medium', nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    marks = Column(Float, default=1.0, nullable=False)
    negative_marks = Column(Float, default=0.0, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    exam_id = Column(Integer, ForeignKey('exams.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    exam = relationship("Exam", back_populates="questions")
    mcq = relationship("MCQQuestion", back_populates="question", uselist=False, cascade="all, delete-orphan")
    coding = relationship("CodingQuestion", back_populates="question", uselist=False, cascade="all, delete-orphan")
    submissions = relationship("QuestionSubmission", back_populates="question", cascade="all, delete-orphan")


class MCQQuestion(Base):
    __tablename__ = 'mcq_questions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey('questions.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Relationships
    question = relationship("Question", back_populates="mcq")
    options = relationship("MCQOption", back_populates="mcq_question", cascade="all, delete-orphan")


class MCQOption(Base):
    __tablename__ = 'mcq_options'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    option_text = Column(String(1000), nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    mcq_question_id = Column(Integer, ForeignKey('mcq_questions.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    mcq_question = relationship("MCQQuestion", back_populates="options")
    submissions = relationship("MCQSubmission", back_populates="selected_option")


class CodingQuestion(Base):
    __tablename__ = 'coding_questions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    programming_language = Column(String(50), nullable=False)
    starter_code = Column(Text, nullable=False)
    solution_code = Column(Text, nullable=False)
    time_limit_seconds = Column(Integer, default=30, nullable=False, comment="Time limit for code execution")
    memory_limit_mb = Column(Integer, default=256, nullable=False, comment="Memory limit in MB")
    question_id = Column(Integer, ForeignKey('questions.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Relationships
    question = relationship("Question", back_populates="coding")
    test_cases = relationship("TestCase", back_populates="coding_question", cascade="all, delete-orphan")


class TestCase(Base):
    __tablename__ = 'test_cases'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    input_data = Column(Text, nullable=False, comment="Input for the test case")
    expected_output = Column(Text, nullable=False, comment="Expected output")
    is_visible = Column(Boolean, default=True, nullable=False, comment="Visible to student during exam")
    order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    coding_question_id = Column(Integer, ForeignKey('coding_questions.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    coding_question = relationship("CodingQuestion", back_populates="test_cases")


class QuestionSubmission(Base):
    __tablename__ = 'question_submissions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    status = Column(String(20), default='not_attempted', nullable=False)
    marks_obtained = Column(Float, default=0.0, nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    enrollment_id = Column(Integer, ForeignKey('exam_enrollments.id', ondelete='CASCADE'), nullable=False)
    question_id = Column(Integer, ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    
    __table_args__ = (UniqueConstraint('enrollment_id', 'question_id', name='question_submissions_enrollment_question_uniq'),)
    
    # Relationships
    enrollment = relationship("ExamEnrollment", back_populates="submissions")
    question = relationship("Question", back_populates="submissions")
    mcq_submission = relationship("MCQSubmission", back_populates="submission", uselist=False, cascade="all, delete-orphan")
    coding_submission = relationship("CodingSubmission", back_populates="submission", uselist=False, cascade="all, delete-orphan")


class MCQSubmission(Base):
    __tablename__ = 'mcq_submissions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey('question_submissions.id', ondelete='CASCADE'), nullable=False, unique=True)
    selected_option_id = Column(Integer, ForeignKey('mcq_options.id', ondelete='SET_NULL'), nullable=True)
    
    # Relationships
    submission = relationship("QuestionSubmission", back_populates="mcq_submission")
    selected_option = relationship("MCQOption", back_populates="submissions")


class CodingSubmission(Base):
    __tablename__ = 'coding_submissions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    submitted_code = Column(Text, nullable=False, comment="Code submitted by student")
    execution_status = Column(String(30), default='pending', nullable=False)
    test_cases_passed = Column(Integer, default=0, nullable=False)
    total_test_cases = Column(Integer, default=0, nullable=False)
    execution_output = Column(Text, default='', nullable=False, comment="Output from code execution")
    error_message = Column(Text, default='', nullable=False, comment="Error message if any")
    execution_time_ms = Column(Float, nullable=True)
    memory_used_mb = Column(Float, nullable=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    executed_at = Column(DateTime, nullable=True)
    submission_id = Column(Integer, ForeignKey('question_submissions.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Relationships
    submission = relationship("QuestionSubmission", back_populates="coding_submission")
    test_case_results = relationship("CodingTestCaseResult", back_populates="coding_submission", cascade="all, delete-orphan")


class CodingTestCaseResult(Base):
    __tablename__ = 'coding_test_case_results'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    test_case_order = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    actual_output = Column(Text, default='', nullable=False)
    expected_output = Column(Text, default='', nullable=False)
    error_message = Column(Text, default='', nullable=False)
    execution_time_ms = Column(Float, nullable=True)
    memory_used_mb = Column(Float, nullable=True)
    coding_submission_id = Column(Integer, ForeignKey('coding_submissions.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    coding_submission = relationship("CodingSubmission", back_populates="test_case_results")
