from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.course import Course, CourseEnrollment, CourseProgress

class CourseRepository:
    @staticmethod
    def get_all_published(db: Session) -> List[Course]:
        return db.query(Course).filter(Course.is_published == True).all()
        
    @staticmethod
    def get_by_id(db: Session, course_id: int) -> Optional[Course]:
        return db.query(Course).filter(Course.id == course_id).first()
        
    @staticmethod
    def get_enrollments_by_student(db: Session, student_id: int) -> List[CourseEnrollment]:
        return db.query(CourseEnrollment).filter(CourseEnrollment.student_id == student_id).all()
        
    @staticmethod
    def get_enrollment(db: Session, student_id: int, course_id: int) -> Optional[CourseEnrollment]:
        return db.query(CourseEnrollment).filter(
            CourseEnrollment.student_id == student_id,
            CourseEnrollment.course_id == course_id
        ).first()
        
    @staticmethod
    def create_course(db: Session, course: Course) -> Course:
        db.add(course)
        db.commit()
        db.refresh(course)
        return course
        
    @staticmethod
    def create_enrollment(db: Session, enrollment: CourseEnrollment) -> CourseEnrollment:
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        return enrollment
