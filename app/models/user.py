from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date
from sqlalchemy.orm import relationship
import datetime
from app.database.db import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    password = Column(String(128), nullable=False)
    last_login = Column(DateTime, nullable=True)
    is_superuser = Column(Boolean, default=False, nullable=False)
    username = Column(String(150), unique=True, index=True, nullable=False)
    first_name = Column(String(150), default='', nullable=False)
    last_name = Column(String(150), default='', nullable=False)
    email = Column(String(254), nullable=False)
    is_staff = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    date_joined = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    role = Column(String(20), default='student', nullable=False)
    phone = Column(String(20), nullable=True)
    profile_picture = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    institution = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    courses_taught = relationship("Course", back_populates="instructor", cascade="all, delete-orphan")
    course_enrollments = relationship("CourseEnrollment", back_populates="student", cascade="all, delete-orphan")
    exam_enrollments = relationship("ExamEnrollment", back_populates="student", cascade="all, delete-orphan")
