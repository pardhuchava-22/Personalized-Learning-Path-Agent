from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import uuid
import json
from app.database.db import get_db
from app.api.users import get_current_user
from app.models.user import User
from app.models.course import (
    Course, CourseEnrollment, CourseProgress, CourseGenerationTask,
    CourseGenerationStep, Module, Quiz, QuizQuestion, CodingChallenge,
    VideoTimestamp, VideoProgress, QuizAttempt, ChallengeSubmission, RevisionSession
)
from app.models.exam import Exam, ExamEnrollment, Question, QuestionSubmission
from app.repositories.course_repo import CourseRepository
from app.services.course_generator import (
    TASK_QUEUE, extract_youtube_id, extract_playlist_id,
    has_complete_generated_content, course_expected_features,
    normalize_include_options, parse_learning_minutes
)
import datetime

router = APIRouter(prefix="/exams", tags=["exams_and_courses"])
FACULTY_ROLES = {"faculty", "instructor", "admin"}

def _parse_iso_date_or_none(value: Any):
    if isinstance(value, datetime.date):
        return value
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.date.fromisoformat(text[:10])
    except ValueError:
        return None

def _format_duration(seconds: int) -> str:
    seconds = max(0, int(seconds or 0))
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

def _format_timestamp(seconds: int) -> str:
    seconds = max(0, int(seconds or 0))
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def _build_youtube_thumbnail(youtube_url: str) -> str:
    video_id = extract_youtube_id(youtube_url or "")
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg" if video_id else ""

def _resolve_thumbnail(course: Course) -> str:
    thumbnail = course.thumbnail or ""
    youtube_url = ""
    if course.youtube_video_id:
        youtube_url = f"https://www.youtube.com/watch?v={course.youtube_video_id}"
    elif course.youtube_playlist_id:
        youtube_url = f"https://www.youtube.com/playlist?list={course.youtube_playlist_id}"
    if not thumbnail:
        return _build_youtube_thumbnail(youtube_url) or thumbnail
    if "picsum.photos" in thumbnail:
        return _build_youtube_thumbnail(youtube_url) or thumbnail
    return thumbnail

def _canonical_generation_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    advanced = dict(data.get("advanced_options") or {})
    advanced.update({
        "focus_areas": advanced.get("focus_areas") or data.get("focusAreas") or [],
        "include": normalize_include_options(advanced.get("include") or data.get("includes")),
        "difficulty": advanced.get("difficulty") or data.get("difficulty") or "medium",
        "language": advanced.get("language") or data.get("language") or "English",
        "question_complexity": advanced.get("question_complexity") or data.get("questionComplexity") or "balanced",
        "coding_difficulty": advanced.get("coding_difficulty") or data.get("codingDifficulty") or "medium",
        "weekend_learning": advanced.get("weekend_learning", data.get("preferWeekend", False)),
        "practice_time": advanced.get("practice_time") or data.get("preferredPracticeTime") or "30-40 mins/day",
        "preferred_start_time": advanced.get("preferred_start_time") or data.get("preferredStartTime") or "09:00",
    })

    return {
        "youtube_url": data.get("youtube_url") or data.get("youtubeUrl") or "",
        "daily_learning_time": data.get("daily_learning_time") or data.get("dailyTime") or "2 Hours",
        "start_date": data.get("start_date") or data.get("startDate") or datetime.date.today().isoformat(),
        "goals": data.get("goals") or data.get("learningGoal") or "",
        "advanced_options": advanced,
    }

# ─── COURSES ROUTERS ─────────────────────────────────────────────────

@router.get("/courses/")
def list_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).all()
    # Format to match frontend SmartCourse attributes
    return [{
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "thumbnail": _resolve_thumbnail(c),
        "difficulty": c.difficulty,
        "category": c.category,
        "total_lessons": c.total_lessons,
        "is_published": c.is_published,
        "created_at": c.created_at,
        "instructor_id": c.instructor_id,
        "start_date": c.start_date.isoformat() if c.start_date else "",
        "video_duration": _format_duration(c.total_duration_seconds or 0),
        "daily_learning_time_minutes": c.daily_learning_time_minutes or 0,
        "language": c.language or "English"
    } for c in courses]

@router.post("/courses/")
def create_course(data: Dict[str, Any], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create the course
    new_course = Course(
        title=data.get("title", "Untitled Course"),
        description=data.get("description", "AI-Generated learning timeline"),
        thumbnail=data.get("thumbnail", "https://picsum.photos/seed/py/200/120"),
        difficulty=data.get("difficulty", "beginner"),
        category=data.get("category", "coding"),
        total_lessons=data.get("total_lessons", 10),
        instructor_id=current_user.id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    
    # Auto-enroll this user in the created course
    enrollment = CourseEnrollment(
        course_id=new_course.id,
        student_id=current_user.id,
        completed_lessons=0
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    # Create the progress record linked to this enrollment
    progress = CourseProgress(
        enrollment_id=enrollment.id,
        course_id=new_course.id,
        progress_percentage=0,
        status="not_started"
    )
    db.add(progress)
    db.commit()

    for idx, module_data in enumerate(data.get("modules", [])):
        module = Module(
            course_id=new_course.id,
            title=module_data.get("title", f"Module {idx + 1}"),
            description=module_data.get("description", ""),
            video_url=module_data.get("video_url"),
            order=module_data.get("order", idx + 1)
        )
        db.add(module)
        db.commit()
        db.refresh(module)

        for quiz_data in module_data.get("quizzes", []):
            quiz = Quiz(
                module_id=module.id,
                title=quiz_data.get("title", f"{module.title} Quiz"),
                passing_score=quiz_data.get("passing_score", 70)
            )
            db.add(quiz)
            db.commit()
            db.refresh(quiz)

            for question_data in quiz_data.get("questions", []):
                options = question_data.get("options", [])
                db.add(QuizQuestion(
                    quiz_id=quiz.id,
                    question_text=question_data.get("question_text") or question_data.get("question", "Question"),
                    options_json=json.dumps(options),
                    correct_option_index=question_data.get("correct_option_index", 0)
                ))
            db.commit()

        for challenge_data in module_data.get("coding_challenges", []):
            db.add(CodingChallenge(
                module_id=module.id,
                title=challenge_data.get("title", f"{module.title} Challenge"),
                instructions=challenge_data.get("instructions", ""),
                starter_code=challenge_data.get("starter_code", ""),
                solution_code=challenge_data.get("solution_code", ""),
                programming_language=challenge_data.get("programming_language", "python"),
                test_cases_json=json.dumps(challenge_data.get("test_cases", []))
            ))
        db.commit()
    
    return {
        "id": new_course.id,
        "title": new_course.title,
        "description": new_course.description,
        "thumbnail": new_course.thumbnail,
        "difficulty": new_course.difficulty,
        "category": new_course.category,
        "total_lessons": new_course.total_lessons
    }

@router.post("/courses/generate/")
async def generate_course(data: Dict[str, Any], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = _canonical_generation_payload(data)
    url = payload["youtube_url"]
    if not url:
        raise HTTPException(status_code=400, detail="Please enter YouTube URL")

    if not payload["daily_learning_time"]:
        raise HTTPException(status_code=400, detail="Please select learning duration")

    parsed_start_date = _parse_iso_date_or_none(payload["start_date"])
    if not parsed_start_date:
        raise HTTPException(status_code=400, detail="Invalid start date")
        
    video_id = extract_youtube_id(url)
    playlist_id = extract_playlist_id(url)
    if not video_id and not playlist_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube video or playlist link")
    
    # Assert unique duplicate prevention check with explicit, index-friendly separate lookups
    existing = None
    if playlist_id:
        existing = db.query(Course).filter(
            Course.instructor_id == current_user.id,
            Course.youtube_playlist_id == playlist_id
        ).first()
    elif video_id:
        existing = db.query(Course).filter(
            Course.instructor_id == current_user.id,
            Course.youtube_video_id == video_id
        ).first()
    
    if existing and has_complete_generated_content(existing):
        return {
            "task_id": None,
            "course_id": existing.id,
            "status": "completed",
            "duplicate": True,
            "message": "Course already exists. Resume existing?"
        }

    if existing:
        db.delete(existing)
        db.commit()
        
    task_id = str(uuid.uuid4())
    task = CourseGenerationTask(
        id=task_id,
        user_id=current_user.id,
        youtube_url=url,
        status="pending",
        progress=0,
        current_step="Initializing",
        request_payload_json=json.dumps(payload),
        daily_learning_time_minutes=parse_learning_minutes(payload["daily_learning_time"]),
        start_date=parsed_start_date,
        goals=payload.get("goals", ""),
        advanced_options_json=json.dumps(payload.get("advanced_options", {}))
    )
    db.add(task)
    db.commit()
    
    # Enqueue task in worker pool
    await TASK_QUEUE.put(task_id)
    
    return {
        "task_id": task_id,
        "course_id": None,
        "status": "pending",
        "message": "Generation enqueued successfully"
    }

@router.get("/courses/generation-status/{task_id}")
def get_generation_status(task_id: str, db: Session = Depends(get_db)):
    task = db.query(CourseGenerationTask).filter(CourseGenerationTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Generation task not found")
        
    return {
        "task_id": task.id,
        "status": task.status,
        "progress": task.progress,
        "current_step": task.current_step,
        "course_id": task.course_id
    }

course_router = APIRouter(prefix="/course", tags=["course_generation"])

@course_router.post("/generate")
@course_router.post("/generate/")
async def generate_course_alias(data: Dict[str, Any], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await generate_course(data, current_user, db)

@course_router.get("/status/{task_id}")
def get_generation_status_alias(task_id: str, db: Session = Depends(get_db)):
    return get_generation_status(task_id, db)

@router.post("/courses/generate/retry/{task_id}")
async def retry_generation(task_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(CourseGenerationTask).filter(
        CourseGenerationTask.id == task_id,
        CourseGenerationTask.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = "pending"
    task.progress = 10
    task.current_step = "Retrying failed task step..."
    
    # Reset failed steps
    failed_steps = db.query(CourseGenerationStep).filter(
        CourseGenerationStep.task_id == task_id,
        CourseGenerationStep.status == "failed"
    ).all()
    for s in failed_steps:
        s.status = "pending"
        
    db.commit()
    await TASK_QUEUE.put(task_id)
    return {"detail": "Task retry enqueued"}

@router.get("/courses/pending-tasks")
def get_pending_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(CourseGenerationTask).filter(
        CourseGenerationTask.user_id == current_user.id,
        CourseGenerationTask.status.in_(["pending", "processing"])
    ).order_by(CourseGenerationTask.created_at.desc()).first()
    if task:
        return {
            "task_id": task.id,
            "status": task.status,
            "progress": task.progress,
            "current_step": task.current_step
        }
    return {"task_id": None}

@router.get("/courses/verify/{course_id}")
def verify_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return {"verified": False, "reason": "Course record missing"}
        
    modules = db.query(Module).filter(Module.course_id == course_id).all()
    if not modules:
        return {"verified": False, "reason": "Modules not generated"}
    if len(modules) < 3:
        return {"verified": False, "reason": "Course has an incomplete generated module plan"}

    expected_features = course_expected_features(course)
        
    # Check generated curriculum content deeply enough that the frontend will not
    # redirect into an empty/demo course.
    for m in modules:
        timestamps = db.query(VideoTimestamp).filter(VideoTimestamp.module_id == m.id).all()
        if not timestamps:
            return {"verified": False, "reason": f"Timestamp boundaries missing for module: {m.title}"}

        if expected_features["quiz"]:
            quiz = db.query(Quiz).filter(Quiz.module_id == m.id).first()
            if not quiz:
                return {"verified": False, "reason": f"Quiz missing for module: {m.title}"}
            questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
            if len(questions) < 4:
                return {"verified": False, "reason": f"Quiz questions missing for module: {m.title}"}
            for q in questions:
                try:
                    options = json.loads(q.options_json or "[]")
                except Exception:
                    options = []
                if len(options) < 4:
                    return {"verified": False, "reason": f"Quiz options missing for module: {m.title}"}

        if expected_features["coding"]:
            challenge = db.query(CodingChallenge).filter(CodingChallenge.module_id == m.id).first()
            if not challenge:
                return {"verified": False, "reason": f"Coding challenge missing for module: {m.title}"}
            if not challenge.starter_code or not challenge.solution_code:
                return {"verified": False, "reason": f"Coding challenge code missing for module: {m.title}"}
            try:
                test_cases = json.loads(challenge.test_cases_json or "[]")
            except Exception:
                test_cases = []
            if len(test_cases) < 2:
                return {"verified": False, "reason": f"Coding challenge test cases missing for module: {m.title}"}
            
    progress = db.query(CourseProgress).filter(CourseProgress.course_id == course_id).first()
    if not progress:
        return {"verified": False, "reason": "Course progress tracking record missing"}
        
    return {"verified": True}

@router.get("/courses/my_courses/")
def get_my_courses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.student_id == current_user.id).all()
    rows = []
    for e in enrollments:
        course = e.course
        modules = course.modules or []
        quizzes_total = sum(len(m.quizzes) for m in modules)
        challenge_total = sum(len(m.coding_challenges) for m in modules)
        revision_total = sum(len(m.revision_sessions) for m in modules)
        youtube_url = ""
        if course.youtube_video_id:
            youtube_url = f"https://www.youtube.com/watch?v={course.youtube_video_id}"
        elif course.youtube_playlist_id:
            youtube_url = f"https://www.youtube.com/playlist?list={course.youtube_playlist_id}"

        rows.append({
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "thumbnail": course.thumbnail,
            "difficulty": course.difficulty,
            "category": course.category,
            "youtube_url": youtube_url,
            "video_duration": _format_duration(course.total_duration_seconds or 0),
            "start_date": course.start_date.isoformat() if course.start_date else (course.created_at.strftime("%Y-%m-%d") if course.created_at else ""),
            "daily_learning_time_minutes": course.daily_learning_time_minutes or 0,
            "language": course.language or "English",
            "progress": e.progress_details.progress_percentage if e.progress_details else 0,
            "completed_lessons": e.completed_lessons,
            "total_lessons": len(modules) or course.total_lessons,
            "status": e.progress_details.status if e.progress_details else 'not_started',
            "modules": {"completed": e.completed_lessons, "total": len(modules) or course.total_lessons},
            "quizzes": {"completed": 0, "total": quizzes_total},
            "coding_challenges": {"completed": 0, "total": challenge_total},
            "revisions": {"completed": 0, "total": revision_total}
        })
    return rows

@router.get("/courses/{course_id}/")
def get_course_detail(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    youtube_url = ""
    if course.youtube_video_id:
        youtube_url = f"https://www.youtube.com/watch?v={course.youtube_video_id}"
    elif course.youtube_playlist_id:
        youtube_url = f"https://www.youtube.com/playlist?list={course.youtube_playlist_id}"
        
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.student_id == current_user.id
    ).first()
    
    modules_data = []
    sorted_modules = sorted(course.modules, key=lambda m: m.order)
    
    for m in sorted_modules:
        quizzes_data = []
        for q in m.quizzes:
            questions_data = []
            for quest in q.questions:
                try:
                    options = json.loads(quest.options_json)
                except Exception:
                    options = []
                questions_data.append({
                    "id": quest.id,
                    "question_text": quest.question_text,
                    "options": options,
                    "correct_option_index": quest.correct_option_index
                })
            quizzes_data.append({
                "id": q.id,
                "title": q.title,
                "passing_score": q.passing_score,
                "questions": questions_data
            })
            
        challenges_data = []
        for cc in m.coding_challenges:
            try:
                test_cases = json.loads(cc.test_cases_json)
            except Exception:
                test_cases = []
            challenges_data.append({
                "id": cc.id,
                "title": cc.title,
                "instructions": cc.instructions,
                "starter_code": cc.starter_code,
                "solution_code": cc.solution_code,
                "programming_language": cc.programming_language,
                "test_cases": test_cases
            })

        timestamps_data = [{
            "id": ts.id,
            "seconds": ts.timestamp_seconds,
            "time": _format_timestamp(ts.timestamp_seconds),
            "label": ts.label
        } for ts in sorted(m.timestamps, key=lambda ts: ts.timestamp_seconds)]
            
        modules_data.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "estimated_minutes": m.estimated_minutes or 60,
            "video_url": m.video_url,
            "order": m.order,
            "learning_day": m.learning_day or m.order,
            "scheduled_date": m.scheduled_date.isoformat() if m.scheduled_date else "",
            "scheduled_time": m.scheduled_time or "",
            "watch_start_seconds": m.watch_start_seconds or 0,
            "watch_end_seconds": m.watch_end_seconds or 0,
            "watch_start": _format_timestamp(m.watch_start_seconds or 0),
            "watch_end": _format_timestamp(m.watch_end_seconds or 0),
            "source_video_id": m.source_video_id,
            "timestamps": timestamps_data,
            "quizzes": quizzes_data,
            "coding_challenges": challenges_data
        })

    try:
        advanced_options = json.loads(course.advanced_options_json or "{}")
    except Exception:
        advanced_options = {}
        
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "thumbnail": _resolve_thumbnail(course),
        "difficulty": course.difficulty,
        "category": course.category,
        "youtube_url": youtube_url,
        "total_lessons": course.total_lessons,
        "video_duration": _format_duration(course.total_duration_seconds or 0),
        "total_duration_seconds": course.total_duration_seconds or 0,
        "start_date": course.start_date.isoformat() if course.start_date else "",
        "daily_learning_time_minutes": course.daily_learning_time_minutes or 0,
        "learning_goal": course.learning_goal or "",
        "advanced_options": advanced_options,
        "language": course.language or "English",
        "channel_name": course.channel_name or "",
        "video_count": course.video_count or 1,
        "progress": enrollment.progress_details.progress_percentage if (enrollment and enrollment.progress_details) else 0,
        "status": enrollment.progress_details.status if (enrollment and enrollment.progress_details) else "not_started",
        "modules": modules_data
    }

@router.post("/courses/{course_id}/enroll/")
def enroll_course(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.student_id == current_user.id
    ).first()
    if existing:
        return {"detail": "Already enrolled"}
        
    enrollment = CourseEnrollment(
        course_id=course_id,
        student_id=current_user.id,
        completed_lessons=0
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return {"detail": "Enrolled successfully", "enrollment_id": enrollment.id}

@router.get("/courses/{course_id}/resume/")
def get_course_resume(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Compute the exact pending learning module, timestamp, and assessments for resume."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    sorted_modules = sorted(course.modules, key=lambda m: m.order)
    if not sorted_modules:
        return {"route": f"/course/{course_id}", "reason": "no_modules"}

    for m in sorted_modules:
        # Check video progress for this student
        progress = db.query(VideoProgress).filter(
            VideoProgress.student_id == current_user.id,
            VideoProgress.module_id == m.id
        ).first()
        
        video_completed = progress.is_completed if progress else False
        watch_time = progress.watch_time_seconds if progress else 0

        if not video_completed:
            # Student hasn't finished this video — resume here
            return {
                "route": f"/course/{course_id}/learn?module_id={m.id}",
                "module_id": m.id,
                "module_title": m.title,
                "module_order": m.order,
                "watch_time_seconds": watch_time,
                "reason": "video_incomplete"
            }
        
        # Video is complete — check if quiz is pending
        quiz = db.query(Quiz).filter(Quiz.module_id == m.id).first()
        if quiz:
            passed_attempt = db.query(QuizAttempt).filter(
                QuizAttempt.student_id == current_user.id,
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.is_passed == True
            ).first()
            if not passed_attempt:
                return {
                    "route": f"/quiz?course_id={course_id}&module_id={m.id}",
                    "module_id": m.id,
                    "module_title": m.title,
                    "module_order": m.order,
                    "reason": "quiz_pending"
                }
        
        # Check if coding challenge is pending
        challenge = db.query(CodingChallenge).filter(CodingChallenge.module_id == m.id).first()
        if challenge:
            passed_submission = db.query(ChallengeSubmission).filter(
                ChallengeSubmission.student_id == current_user.id,
                ChallengeSubmission.challenge_id == challenge.id,
                ChallengeSubmission.is_passed == True
            ).first()
            if not passed_submission:
                return {
                    "route": f"/lab?course_id={course_id}&module_id={m.id}",
                    "module_id": m.id,
                    "module_title": m.title,
                    "module_order": m.order,
                    "reason": "challenge_pending"
                }
    
    # All modules completed
    return {
        "route": f"/course/{course_id}",
        "reason": "all_completed",
        "progress": 100
    }

@router.delete("/courses/{course_id}/")
def delete_course(course_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()
    return {"detail": "Course deleted successfully"}

# ─── EXAMS ROUTERS ───────────────────────────────────────────────────

@router.get("/exams/")
def list_exams(db: Session = Depends(get_db)):
    return db.query(Exam).all()

@router.get("/exams/dashboard_stats/")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role in FACULTY_ROLES:
        total_courses = db.query(Course).filter(Course.instructor_id == current_user.id).count()
        active_exams = db.query(Exam).filter(
            Exam.instructor_id == current_user.id,
            Exam.status == 'active'
        ).count()
        total_students = db.query(CourseEnrollment.student_id).join(Course).filter(
            Course.instructor_id == current_user.id
        ).distinct().count()
        flagged_sessions = db.query(ExamEnrollment).join(Exam).filter(
            Exam.instructor_id == current_user.id,
            ExamEnrollment.total_violations > 0
        ).count()
        return {
            "total_courses": total_courses,
            "active_exams": active_exams,
            "total_students": total_students,
            "flagged_sessions": flagged_sessions
        }
    
    now = datetime.datetime.utcnow()
    course_enrollments = db.query(CourseEnrollment).filter(
        CourseEnrollment.student_id == current_user.id
    ).all()
    enrolled_course_ids = [enrollment.course_id for enrollment in course_enrollments]

    progress_records = db.query(CourseProgress).filter(
        CourseProgress.enrollment_id.in_([enrollment.id for enrollment in course_enrollments])
    ).all() if course_enrollments else []
    progress_by_enrollment = {record.enrollment_id: record.progress_percentage for record in progress_records}
    enrolled_courses = len(course_enrollments)
    overall_progress = round(
        sum(progress_by_enrollment.get(enrollment.id, 0) for enrollment in course_enrollments) / enrolled_courses
    ) if enrolled_courses else 0
    completed_courses = sum(
        1 for enrollment in course_enrollments
        if progress_by_enrollment.get(enrollment.id, 0) >= 100
    )

    course_modules = db.query(Module).filter(Module.course_id.in_(enrolled_course_ids)).all() if enrolled_course_ids else []
    module_ids = [module.id for module in course_modules]
    completed_lessons = db.query(VideoProgress).filter(
        VideoProgress.student_id == current_user.id,
        VideoProgress.module_id.in_(module_ids),
        VideoProgress.is_completed == True
    ).count() if module_ids else 0

    course_quizzes = db.query(Quiz).filter(Quiz.module_id.in_(module_ids)).all() if module_ids else []
    quiz_ids = [quiz.id for quiz in course_quizzes]
    completed_quizzes = db.query(QuizAttempt.quiz_id).filter(
        QuizAttempt.student_id == current_user.id,
        QuizAttempt.quiz_id.in_(quiz_ids),
        QuizAttempt.is_passed == True
    ).distinct().count() if quiz_ids else 0

    course_challenges = db.query(CodingChallenge).filter(CodingChallenge.module_id.in_(module_ids)).all() if module_ids else []
    challenge_ids = [challenge.id for challenge in course_challenges]
    completed_challenges = db.query(ChallengeSubmission.challenge_id).filter(
        ChallengeSubmission.student_id == current_user.id,
        ChallengeSubmission.challenge_id.in_(challenge_ids),
        ChallengeSubmission.is_passed == True
    ).distinct().count() if challenge_ids else 0

    completed_exam_enrollments = db.query(ExamEnrollment).filter(
        ExamEnrollment.student_id == current_user.id,
        ExamEnrollment.status.in_(["submitted", "completed"])
    ).all()
    completed_exams = len(completed_exam_enrollments)
    average_score = (
        sum(enrollment.percentage or 0.0 for enrollment in completed_exam_enrollments) / completed_exams
        if completed_exams > 0 else 0.0
    )
    tasks_completed = completed_lessons + completed_quizzes + completed_challenges + completed_exams

    assignment_exams = db.query(Exam).order_by(Exam.start_time.asc()).all()
    assignments = []
    for ex in assignment_exams:
        enrollment = db.query(ExamEnrollment).filter(
            ExamEnrollment.exam_id == ex.id,
            ExamEnrollment.student_id == current_user.id
        ).first()
        question_count = db.query(Question).filter(Question.exam_id == ex.id).count()
        hours_until_due = (ex.start_time - now).total_seconds() / 3600 if ex.start_time else 9999
        if enrollment and enrollment.status in ["submitted", "completed"]:
            priority = "low"
        elif hours_until_due <= 48:
            priority = "high"
        elif hours_until_due <= 168:
            priority = "medium"
        else:
            priority = "low"
        assignment = {
            "id": ex.id,
            "title": ex.title,
            "course_name": ex.course_name,
            "start_time": ex.start_time.isoformat() if ex.start_time else "",
            "duration_minutes": ex.duration_minutes,
            "question_count": question_count,
            "priority": priority,
            "status": enrollment.status if enrollment else "not_attempted",
            "enrollment_status": enrollment.status if enrollment else None,
            "enrollment_id": enrollment.id if enrollment else None
        }
        assignments.append(assignment)

    weekday_labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    week_start = (now - datetime.timedelta(days=6)).date()
    activity_by_date = {week_start + datetime.timedelta(days=idx): 0 for idx in range(7)}

    for module in course_modules:
        activity_date = module.scheduled_date or (
            module.course.start_date + datetime.timedelta(days=max((module.learning_day or module.order or 1) - 1, 0))
            if module.course and module.course.start_date else None
        )
        if activity_date in activity_by_date:
            activity_by_date[activity_date] += module.estimated_minutes or 0

    quiz_rows = db.query(func.date(QuizAttempt.completed_at), func.count(QuizAttempt.id)).filter(
        QuizAttempt.student_id == current_user.id,
        QuizAttempt.completed_at >= datetime.datetime.combine(week_start, datetime.time.min)
    ).group_by(func.date(QuizAttempt.completed_at)).all()
    for date_value, count in quiz_rows:
        activity_date = _parse_iso_date_or_none(date_value)
        if activity_date in activity_by_date:
            activity_by_date[activity_date] += int(count or 0) * 20

    challenge_rows = db.query(func.date(ChallengeSubmission.submitted_at), func.count(ChallengeSubmission.id)).filter(
        ChallengeSubmission.student_id == current_user.id,
        ChallengeSubmission.submitted_at >= datetime.datetime.combine(week_start, datetime.time.min)
    ).group_by(func.date(ChallengeSubmission.submitted_at)).all()
    for date_value, count in challenge_rows:
        activity_date = _parse_iso_date_or_none(date_value)
        if activity_date in activity_by_date:
            activity_by_date[activity_date] += int(count or 0) * 30

    hourly_activity = []
    for activity_date, minutes in activity_by_date.items():
        hourly_activity.append({
            "day": weekday_labels[(activity_date.weekday() + 1) % 7],
            "date": activity_date.isoformat(),
            "hours": round((minutes or 0) / 60, 1),
            "active": activity_date == now.date()
        })

    return {
        "completed_courses": completed_courses,
        "ongoing_courses": enrolled_courses - completed_courses,
        "enrolled_courses": enrolled_courses,
        "overall_progress": overall_progress,
        "tasks_completed": tasks_completed,
        "task_breakdown": {
            "lessons": completed_lessons,
            "quizzes": completed_quizzes,
            "coding_challenges": completed_challenges,
            "exams": completed_exams
        },
        "upcoming_exams": assignments,
        "assignments": assignments,
        "hourly_activity": hourly_activity,
        "completed_exams": completed_exams,
        "average_score": round(average_score, 1)
    }

@router.get("/exams/my_exams/")
def get_my_exams(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exams = db.query(Exam).all()
    results = []
    for exam in exams:
        enrollment = db.query(ExamEnrollment).filter(
            ExamEnrollment.exam_id == exam.id,
            ExamEnrollment.student_id == current_user.id
        ).first()
        
        results.append({
            "id": exam.id,
            "title": exam.title,
            "description": exam.description,
            "start_time": exam.start_time.isoformat() if exam.start_time else "",
            "end_time": exam.end_time.isoformat() if exam.end_time else "",
            "duration_minutes": exam.duration_minutes,
            "course_name": exam.course_name,
            "enrollment_status": enrollment.status if enrollment else None,
            "enrollment_id": enrollment.id if enrollment else None,
            "question_count": db.query(Question).filter(Question.exam_id == exam.id).count()
        })
    return results

@router.get("/exams/student_detailed_analytics/")
def get_student_detailed_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    enrollments = db.query(ExamEnrollment).filter(
        ExamEnrollment.student_id == current_user.id,
        ExamEnrollment.status.in_(["submitted", "completed"])
    ).all()
    
    total_tests = len(enrollments)
    total_questions = 0
    total_score = 0.0
    total_speed = 0
    
    history_data = []
    history_labels = []
    history_speed_data = []
    
    heatmap = {}
    
    # Track subject accuracy
    subject_correct = {}
    subject_total = {}
    
    for e in enrollments:
        exam = e.exam
        history_labels.append(exam.title)
        history_data.append(e.percentage or 0.0)
        
        # Solving speed per question (approximate as total_time / question_count)
        q_count = db.query(Question).filter(Question.exam_id == exam.id).count()
        total_questions += q_count
        
        avg_speed_q = 0
        if q_count > 0:
            avg_speed_q = round(e.time_taken_seconds / q_count)
        history_speed_data.append(avg_speed_q)
        
        total_score += (e.percentage or 0.0)
        total_speed += avg_speed_q
        
        # Heatmap: format date to YYYY-MM-DD
        date_str = e.submitted_at.date().isoformat() if e.submitted_at else e.enrolled_at.date().isoformat()
        heatmap[date_str] = heatmap.get(date_str, 0) + 1
        
        # Extract question subjects/categories (using course_name or course as fallback)
        subj = exam.course_name or "General"
        submissions = db.query(QuestionSubmission).filter(QuestionSubmission.enrollment_id == e.id).all()
        for sub in submissions:
            subject_total[subj] = subject_total.get(subj, 0) + 1
            if sub.is_correct:
                subject_correct[subj] = subject_correct.get(subj, 0) + 1

    avg_score = round(total_score / total_tests, 1) if total_tests > 0 else 0.0
    avg_speed = round(total_speed / total_tests) if total_tests > 0 else 0
    
    # Calculate subject breakdown
    subjects = []
    if subject_total:
        for name, tot in subject_total.items():
            corr = subject_correct.get(name, 0)
            percentage = round((corr / tot) * 100) if tot > 0 else 0
            subjects.append({"name": name, "value": percentage})
    else:
        # Fallback dummy subjects if no data
        subjects = [
            {"name": "Python Setup & Basics", "value": 85},
            {"name": "Control Flow & Loops", "value": 72},
            {"name": "Data Structures", "value": 90},
            {"name": "Functions & Scope", "value": 68}
        ]
        
    # Strategic radar fallback/dynamic
    avg_integrity = 100.0
    if total_tests > 0:
        avg_integrity = sum(e.integrity_score for e in enrollments) / total_tests
        
    strategic = [
        {"name": "Accuracy", "value": round(avg_score) if avg_score > 0 else 75},
        {"name": "Speed", "value": max(40, min(95, 100 - avg_speed)) if avg_speed > 0 else 70},
        {"name": "Consistency", "value": 80 if total_tests > 1 else 60},
        {"name": "Integrity", "value": round(avg_integrity)},
        {"name": "Complex Solving", "value": 75}
    ]
    
    # Fallback/default KPI values if no exams completed
    if total_tests == 0:
        kpi = {
            "tests": 0,
            "questions": 0,
            "avg_score": 0,
            "speed": "0s"
        }
        # Provide default history so charts don't crash
        history = {
            "data": [0],
            "labels": ["No Data"],
            "speed_data": [0]
        }
    else:
        kpi = {
            "tests": total_tests,
            "questions": total_questions,
            "avg_score": avg_score,
            "speed": f"{avg_speed}s"
        }
        history = {
            "data": history_data,
            "labels": history_labels,
            "speed_data": history_speed_data
        }
        
    return {
        "kpi": kpi,
        "history": history,
        "subjects": subjects,
        "strategic": strategic,
        "heatmap": heatmap
    }

@router.get("/exams/{exam_id}/")
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.post("/exams/{exam_id}/start/")
def start_exam(exam_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    enrollment = db.query(ExamEnrollment).filter(
        ExamEnrollment.exam_id == exam_id,
        ExamEnrollment.student_id == current_user.id
    ).first()
    if not enrollment:
        # Create enrollment if not present
        enrollment = ExamEnrollment(
            exam_id=exam_id,
            student_id=current_user.id,
            status="started",
            started_at=datetime.datetime.utcnow()
        )
        db.add(enrollment)
    else:
        enrollment.status = "started"
        enrollment.started_at = datetime.datetime.utcnow()
    db.commit()
    return {"detail": "Exam started", "enrollment_id": enrollment.id}

# ─── MODULE, QUIZ & CHALLENGE ROUTERS FOR VIDEO LEARNING ──────────────

module_router = APIRouter(prefix="/module", tags=["module_learning"])
quiz_router = APIRouter(prefix="/quiz", tags=["quiz_assessments"])
challenge_router = APIRouter(prefix="/challenge", tags=["challenge_assessments"])

@module_router.get("/{module_id}")
def get_module_detail(module_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
        
    timestamps = db.query(VideoTimestamp).filter(VideoTimestamp.module_id == module_id).order_by(VideoTimestamp.timestamp_seconds.asc()).all()
    timestamps_data = [{
        "id": ts.id,
        "seconds": ts.timestamp_seconds,
        "time": _format_timestamp(ts.timestamp_seconds),
        "label": ts.label
    } for ts in timestamps]
    
    # Get or create video progress for this student
    progress = db.query(VideoProgress).filter(
        VideoProgress.student_id == current_user.id,
        VideoProgress.module_id == module_id
    ).first()
    
    progress_data = {
        "watch_time_seconds": progress.watch_time_seconds if progress else 0,
        "is_completed": progress.is_completed if progress else False
    }
    
    # Check if quiz/challenge exists
    quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first()
    challenge = db.query(CodingChallenge).filter(CodingChallenge.module_id == module_id).first()
    revision_sessions = db.query(RevisionSession).filter(RevisionSession.module_id == module_id).order_by(RevisionSession.scheduled_time.asc()).all()
    
    return {
        "id": module.id,
        "course_id": module.course_id,
        "title": module.title,
        "description": module.description,
        "video_url": module.video_url,
        "order": module.order,
        "estimated_minutes": module.estimated_minutes or 60,
        "learning_day": module.learning_day or module.order,
        "watch_start_seconds": module.watch_start_seconds or 0,
        "watch_end_seconds": module.watch_end_seconds or 0,
        "source_video_id": module.source_video_id,
        "youtube_url": module.video_url or (f"https://www.youtube.com/watch?v={module.source_video_id}" if module.source_video_id else ""),
        "timestamps": timestamps_data,
        "progress": progress_data,
        "has_quiz": quiz is not None,
        "has_challenge": challenge is not None,
        "revision_sessions": [
            {
                "id": revision.id,
                "scheduled_time": revision.scheduled_time.isoformat() if revision.scheduled_time else "",
                "is_completed": revision.is_completed,
                "meeting_link": revision.meeting_link or ""
            }
            for revision in revision_sessions
        ]
    }

@module_router.post("/{module_id}/progress")
def update_module_progress(
    module_id: int, 
    data: Dict[str, Any], 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
        
    watch_time = int(data.get("watch_time_seconds") or 0)
    is_completed = bool(data.get("is_completed") or False)
    
    progress = db.query(VideoProgress).filter(
        VideoProgress.student_id == current_user.id,
        VideoProgress.module_id == module_id
    ).first()
    
    if not progress:
        progress = VideoProgress(
            student_id=current_user.id,
            module_id=module_id,
            watch_time_seconds=watch_time,
            is_completed=is_completed
        )
        db.add(progress)
    else:
        progress.watch_time_seconds = watch_time
        if is_completed:
            progress.is_completed = True
            
    db.commit()
    db.refresh(progress)
    
    # Recalculate course enrollment progress
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == module.course_id,
        CourseEnrollment.student_id == current_user.id
    ).first()
    
    if enrollment:
        # Count all completed modules in this course
        all_modules = db.query(Module).filter(Module.course_id == module.course_id).all()
        module_ids = [m.id for m in all_modules]
        
        completed_count = db.query(VideoProgress).filter(
            VideoProgress.student_id == current_user.id,
            VideoProgress.module_id.in_(module_ids),
            VideoProgress.is_completed == True
        ).count()
        
        enrollment.completed_lessons = completed_count
        
        # Calculate progress percentage (simple ratio of completed modules out of total)
        total_modules = len(all_modules)
        percentage = min(100, round((completed_count / total_modules) * 100)) if total_modules > 0 else 0
        
        progress_record = db.query(CourseProgress).filter(CourseProgress.enrollment_id == enrollment.id).first()
        if progress_record:
            progress_record.progress_percentage = percentage
            progress_record.status = "completed" if percentage == 100 else "in_progress" if percentage > 0 else "not_started"
            
        db.commit()
        
    return {
        "status": "success",
        "watch_time_seconds": progress.watch_time_seconds,
        "is_completed": progress.is_completed
    }

@module_router.get("/{module_id}/quiz")
def get_module_quiz(module_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found for this module")
        
    questions_data = []
    for quest in quiz.questions:
        try:
            options = json.loads(quest.options_json)
        except Exception:
            options = []
        questions_data.append({
            "id": quest.id,
            "question_text": quest.question_text,
            "options": options,
            "correct_option_index": quest.correct_option_index
        })
        
    return {
        "id": quiz.id,
        "title": quiz.title,
        "passing_score": quiz.passing_score,
        "questions": questions_data
    }

@quiz_router.post("/submit")
def submit_quiz_attempt(
    data: Dict[str, Any], 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    quiz_id = int(data.get("quiz_id") or 0)
    score = float(data.get("score_percentage") or 0.0)
    is_passed = bool(data.get("is_passed") or False)
    
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    attempt = QuizAttempt(
        student_id=current_user.id,
        quiz_id=quiz_id,
        score_percentage=score,
        is_passed=is_passed
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    return {
        "status": "success",
        "attempt_id": attempt.id,
        "score_percentage": attempt.score_percentage,
        "is_passed": attempt.is_passed
    }

@module_router.get("/{module_id}/challenge")
def get_module_challenge(module_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    challenge = db.query(CodingChallenge).filter(CodingChallenge.module_id == module_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Coding challenge not found for this module")
        
    try:
        test_cases = json.loads(challenge.test_cases_json)
    except Exception:
        test_cases = []
        
    return {
        "id": challenge.id,
        "title": challenge.title,
        "instructions": challenge.instructions,
        "starter_code": challenge.starter_code,
        "solution_code": challenge.solution_code,
        "programming_language": challenge.programming_language,
        "test_cases": test_cases
    }

@challenge_router.post("/submit")
def submit_challenge_attempt(
    data: Dict[str, Any], 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    challenge_id = int(data.get("challenge_id") or 0)
    code = str(data.get("submitted_code") or "")
    is_passed = bool(data.get("is_passed") or False)
    feedback = str(data.get("feedback") or "")
    
    challenge = db.query(CodingChallenge).filter(CodingChallenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    submission = ChallengeSubmission(
        student_id=current_user.id,
        challenge_id=challenge_id,
        submitted_code=code,
        is_passed=is_passed,
        feedback=feedback
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return {
        "status": "success",
        "submission_id": submission.id,
        "is_passed": submission.is_passed
    }
