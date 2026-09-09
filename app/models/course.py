from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
import datetime
from app.database.db import Base

class Course(Base):
    __tablename__ = 'courses'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, default='', nullable=False)
    thumbnail = Column(String(200), default='', nullable=False)
    difficulty = Column(String(20), default='beginner', nullable=False)
    category = Column(String(20), default='general', nullable=False)
    total_lessons = Column(Integer, default=10, nullable=False)
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    instructor_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    youtube_video_id = Column(String(50), nullable=True)
    youtube_playlist_id = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=True)
    daily_learning_time_minutes = Column(Integer, default=120, nullable=True)
    learning_goal = Column(Text, default='', nullable=True)
    advanced_options_json = Column(Text, default='{}', nullable=True)
    total_duration_seconds = Column(Integer, default=0, nullable=True)
    video_count = Column(Integer, default=1, nullable=True)
    language = Column(String(50), default='English', nullable=True)
    channel_name = Column(String(255), default='', nullable=True)
    
    # Relationships
    instructor = relationship("User", back_populates="courses_taught")
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="course")
    settings = relationship("CourseSettings", back_populates="course", uselist=False, cascade="all, delete-orphan")
    advanced_options = relationship("CourseAdvancedOptions", back_populates="course", uselist=False, cascade="all, delete-orphan")
    features = relationship("CourseIncludeFeatures", back_populates="course", cascade="all, delete-orphan")
    focus_mappings = relationship("CourseFocusMapping", back_populates="course", cascade="all, delete-orphan")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan")
    progress_records = relationship("CourseProgress", back_populates="course", cascade="all, delete-orphan")


class CourseSettings(Base):
    __tablename__ = 'course_settings'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False, unique=True)
    allow_discussion = Column(Boolean, default=True, nullable=False)
    enable_certificate = Column(Boolean, default=True, nullable=False)
    passing_grade_percentage = Column(Float, default=60.0, nullable=False)
    
    course = relationship("Course", back_populates="settings")


class CourseAdvancedOptions(Base):
    __tablename__ = 'course_advanced_options'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False, unique=True)
    require_proctoring_for_exams = Column(Boolean, default=False, nullable=False)
    auto_grading_enabled = Column(Boolean, default=True, nullable=False)
    sandbox_timeout_seconds = Column(Integer, default=15, nullable=False)
    
    course = relationship("Course", back_populates="advanced_options")


class FocusArea(Base):
    __tablename__ = 'focus_areas'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, default='', nullable=False)
    
    course_mappings = relationship("CourseFocusMapping", back_populates="focus_area", cascade="all, delete-orphan")


class CourseFocusMapping(Base):
    __tablename__ = 'course_focus_mapping'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    focus_area_id = Column(Integer, ForeignKey('focus_areas.id', ondelete='CASCADE'), nullable=False)
    
    course = relationship("Course", back_populates="focus_mappings")
    focus_area = relationship("FocusArea", back_populates="course_mappings")


class CourseIncludeFeatures(Base):
    __tablename__ = 'course_include_features'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    feature_name = Column(String(255), nullable=False)
    
    course = relationship("Course", back_populates="features")


class CourseEnrollment(Base):
    __tablename__ = 'course_enrollments'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    completed_lessons = Column(Integer, default=0, nullable=False)
    enrolled_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    last_accessed = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    course = relationship("Course", back_populates="enrollments")
    student = relationship("User", back_populates="course_enrollments")
    progress_details = relationship("CourseProgress", back_populates="enrollment", uselist=False, cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = 'modules'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default='', nullable=False)
    video_url = Column(String(255), nullable=True)
    order = Column(Integer, default=0, nullable=False)
    estimated_minutes = Column(Integer, default=60, nullable=True)
    learning_day = Column(Integer, default=1, nullable=True)
    scheduled_date = Column(Date, nullable=True)
    scheduled_time = Column(String(20), nullable=True)
    watch_start_seconds = Column(Integer, default=0, nullable=True)
    watch_end_seconds = Column(Integer, default=0, nullable=True)
    source_video_id = Column(String(50), nullable=True)
    
    course = relationship("Course", back_populates="modules")
    timestamps = relationship("VideoTimestamp", back_populates="module", cascade="all, delete-orphan")
    video_progress_records = relationship("VideoProgress", back_populates="module", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="module", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="module", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="module", cascade="all, delete-orphan")
    coding_challenges = relationship("CodingChallenge", back_populates="module", cascade="all, delete-orphan")
    revision_sessions = relationship("RevisionSession", back_populates="module", cascade="all, delete-orphan")
    final_exams = relationship("FinalExam", back_populates="module", cascade="all, delete-orphan")


class VideoTimestamp(Base):
    __tablename__ = 'video_timestamps'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    timestamp_seconds = Column(Integer, nullable=False)
    label = Column(String(255), nullable=False)
    
    module = relationship("Module", back_populates="timestamps")


class VideoProgress(Base):
    __tablename__ = 'video_progress'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    watch_time_seconds = Column(Integer, default=0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    
    module = relationship("Module", back_populates="video_progress_records")


class Bookmark(Base):
    __tablename__ = 'bookmarks'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    timestamp_seconds = Column(Integer, nullable=False)
    description = Column(String(255), nullable=True)
    
    module = relationship("Module", back_populates="bookmarks")


class Note(Base):
    __tablename__ = 'notes'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    timestamp_seconds = Column(Integer, nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    module = relationship("Module", back_populates="notes")


class Quiz(Base):
    __tablename__ = 'quizzes'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    passing_score = Column(Integer, default=70, nullable=False)
    
    module = relationship("Module", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = 'quiz_questions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    quiz_id = Column(Integer, ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False)
    question_text = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False, comment="JSON serialized array of choice items")
    correct_option_index = Column(Integer, nullable=False)
    
    quiz = relationship("Quiz", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = 'quiz_attempts'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    quiz_id = Column(Integer, ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False)
    score_percentage = Column(Float, nullable=False)
    is_passed = Column(Boolean, nullable=False)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    quiz = relationship("Quiz", back_populates="attempts")


class CodingChallenge(Base):
    __tablename__ = 'coding_challenges'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    instructions = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=False)
    solution_code = Column(Text, nullable=False)
    programming_language = Column(String(50), default='python', nullable=False)
    test_cases_json = Column(Text, default='[]', nullable=False)
    
    module = relationship("Module", back_populates="coding_challenges")
    submissions = relationship("ChallengeSubmission", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeSubmission(Base):
    __tablename__ = 'challenge_submissions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    challenge_id = Column(Integer, ForeignKey('coding_challenges.id', ondelete='CASCADE'), nullable=False)
    submitted_code = Column(Text, nullable=False)
    is_passed = Column(Boolean, default=False, nullable=False)
    feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    challenge = relationship("CodingChallenge", back_populates="submissions")


class RevisionSession(Base):
    __tablename__ = 'revision_sessions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    meeting_link = Column(String(255), nullable=True)
    
    module = relationship("Module", back_populates="revision_sessions")


class FinalExam(Base):
    __tablename__ = 'final_exams'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    exam_id = Column(Integer, ForeignKey('exams.id', ondelete='SET NULL'), nullable=True)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    
    module = relationship("Module", back_populates="final_exams")
    proctor_logs = relationship("ProctoringLog", back_populates="final_exam", cascade="all, delete-orphan")


class ProctoringLog(Base):
    __tablename__ = 'proctoring_logs'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    final_exam_id = Column(Integer, ForeignKey('final_exams.id', ondelete='CASCADE'), nullable=False)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    violation_count = Column(Integer, default=0, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    log_details = Column(Text, nullable=True)
    
    final_exam = relationship("FinalExam", back_populates="proctor_logs")


class CourseProgress(Base):
    __tablename__ = 'course_progress'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    enrollment_id = Column(Integer, ForeignKey('course_enrollments.id', ondelete='CASCADE'), nullable=False, unique=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    progress_percentage = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default='not_started', nullable=False)
    
    enrollment = relationship("CourseEnrollment", back_populates="progress_details")
    course = relationship("Course", back_populates="progress_records")


class VideoTranscript(Base):
    __tablename__ = 'video_transcripts'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=True)
    youtube_url = Column(String(255), nullable=False, unique=True)
    youtube_video_id = Column(String(50), nullable=True, unique=True)
    full_transcript = Column(Text, nullable=False)
    processed_chunks_json = Column(Text, nullable=True)
    cached_topics_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class CourseGenerationTask(Base):
    __tablename__ = 'course_generation_tasks'
    
    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    youtube_url = Column(Text, nullable=False)
    status = Column(String(20), default='pending', nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    current_step = Column(String(100), default='Initializing...', nullable=False)
    course_id = Column(Integer, nullable=True)
    request_payload_json = Column(Text, default='{}', nullable=True)
    daily_learning_time_minutes = Column(Integer, default=120, nullable=True)
    start_date = Column(Date, nullable=True)
    goals = Column(Text, default='', nullable=True)
    advanced_options_json = Column(Text, default='{}', nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)


class CourseGenerationStep(Base):
    __tablename__ = 'course_generation_steps'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String(50), ForeignKey('course_generation_tasks.id', ondelete='CASCADE'), nullable=False)
    step_name = Column(String(50), nullable=False)
    status = Column(String(20), default='pending', nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    cached_output = Column(Text, nullable=True)


class PromptVersion(Base):
    __tablename__ = 'prompt_versions'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prompt_type = Column(String(50), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    prompt_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default='general', nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
