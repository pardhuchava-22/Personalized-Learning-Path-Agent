import os
import re
import json
import asyncio
import datetime
import time
import urllib.parse
import urllib.request
import subprocess
import pydantic
import threading
import shutil
import sys
from typing import Dict, List, Optional, Any, Tuple
from decouple import config
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi

from exam_proctor_backend.apps.exams.models import (
    Course, CourseEnrollment, CourseProgress, CourseGenerationTask,
    CourseGenerationStep, Module, Quiz, QuizQuestion, CodingChallenge,
    VideoTimestamp, VideoProgress, QuizAttempt, ChallengeSubmission,
    RevisionSession, FinalExam, Note, Notification, VideoTranscript
)

# ─── GEMINI CLIENT CONFIGURATION ──────────────────────────────────────
GEMINI_API_KEY = config("GEMINI_API_KEY", default="")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Task-Based Model Routing Constants
FLASH_LITE_MODEL = "gemini-2.5-flash"
FLASH_MODEL = "gemini-2.5-flash"
PRO_MODEL = "gemini-2.0-flash"

# Concurrency throttling boundaries
_SEMAPHORES = {}
_LOCKS = {}
_TASK_QUEUES = {}

def get_loop_semaphore():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.Semaphore(3)
    
    # Clean up closed loops to prevent memory leaks
    for k in list(_SEMAPHORES.keys()):
        try:
            if k.is_closed():
                _SEMAPHORES.pop(k, None)
        except Exception:
            pass
            
    if loop not in _SEMAPHORES:
        _SEMAPHORES[loop] = asyncio.Semaphore(5)
    return _SEMAPHORES[loop]

def get_loop_rate_limit_lock():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.Lock()
        
    for k in list(_LOCKS.keys()):
        try:
            if k.is_closed():
                _LOCKS.pop(k, None)
        except Exception:
            pass
            
    if loop not in _LOCKS:
        _LOCKS[loop] = asyncio.Lock()
    return _LOCKS[loop]

class LoopBoundSemaphore:
    def __aenter__(self):
        return get_loop_semaphore().__aenter__()
    def __aexit__(self, exc_type, exc_val, exc_tb):
        return get_loop_semaphore().__aexit__(exc_type, exc_val, exc_tb)

class LoopBoundLock:
    def __aenter__(self):
        return get_loop_rate_limit_lock().__aenter__()
    def __aexit__(self, exc_type, exc_val, exc_tb):
        return get_loop_rate_limit_lock().__aexit__(exc_type, exc_val, exc_tb)

SEMAPHORE = LoopBoundSemaphore()
RATE_LIMIT_LOCK = LoopBoundLock()

MAX_PLAYLIST_VIDEOS = 15
MAX_TRANSCRIPT_WORDS = 15000  # Token safety threshold
MAX_GENERATED_MODULES = 20
DEFAULT_SESSION_TIME = "09:00"

# Global task worker queue
def get_loop_task_queue():
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.Queue()
    if loop not in _TASK_QUEUES:
        _TASK_QUEUES[loop] = asyncio.Queue()
    return _TASK_QUEUES[loop]

class LoopBoundQueue:
    @property
    def queue(self):
        return get_loop_task_queue()
    def put_nowait(self, item):
        return self.queue.put_nowait(item)
    async def get(self):
        return await self.queue.get()
    def task_done(self):
        return self.queue.task_done()

TASK_QUEUE = LoopBoundQueue()

DEFAULT_ADVANCED_OPTIONS = {
    "focus_areas": ["Basics & Fundamentals"],
    "include": ["quiz", "coding", "revision", "final_test"],
    "difficulty": "medium",
    "language": "English",
    "question_complexity": "balanced",
    "coding_difficulty": "medium",
    "weekend_learning": False,
    "practice_time": "30-40 mins/day",
    "preferred_start_time": DEFAULT_SESSION_TIME,
}

INCLUDE_ALIASES = {
    "quizzes": "quiz",
    "quiz": "quiz",
    "mcq": "quiz",
    "coding_challenges": "coding",
    "coding": "coding",
    "revision_sessions": "revision",
    "revision": "revision",
    "final": "final_test",
    "final_test": "final_test",
    "final test": "final_test",
}

STOPWORDS = {
    "about", "after", "again", "also", "and", "are", "because", "been", "before",
    "being", "between", "course", "does", "each", "from", "have", "into", "learn",
    "lesson", "like", "more", "next", "that", "their", "then", "there", "these",
    "this", "through", "using", "video", "watch", "what", "when", "where", "which",
    "with", "will", "you", "your",
}

TECH_TERMS = [
    "setup", "installation", "variable", "variables", "function", "functions",
    "array", "arrays", "list", "lists", "tuple", "tuples", "set", "sets",
    "dictionary", "dictionaries", "loop", "loops", "condition", "conditional",
    "class", "object", "method", "module", "package", "file", "exception",
    "api", "component", "state", "props", "hook", "routing", "database",
    "query", "model", "testing", "project", "deployment", "authentication",
]

PYTHON_CURRICULUM_BLUEPRINT = [
    {
        "title": "Python Setup and First Program",
        "description": "Install Python, understand the interpreter, run scripts, and write simple print/input programs.",
        "focus_concepts": ["Python setup", "print", "input", "scripts"],
        "challenge": "Write a greeter that reads a name and prints a formatted welcome message."
    },
    {
        "title": "Variables, Values, and Basic Types",
        "description": "Use variables, numbers, strings, booleans, type conversion, and formatted output.",
        "focus_concepts": ["variables", "integers", "floats", "strings", "type conversion"],
        "challenge": "Convert a Celsius value to Fahrenheit and format the result."
    },
    {
        "title": "Strings and Text Processing",
        "description": "Slice strings, call string methods, normalize text, and build reusable text transformations.",
        "focus_concepts": ["string slicing", "methods", "case conversion", "strip"],
        "challenge": "Normalize a sentence into title case after removing extra whitespace."
    },
    {
        "title": "Conditionals and Boolean Logic",
        "description": "Make decisions with if, elif, else, comparison operators, and compound boolean expressions.",
        "focus_concepts": ["if statements", "comparisons", "and/or/not", "branching"],
        "challenge": "Classify a number as positive, negative, or zero."
    },
    {
        "title": "Loops and Iteration",
        "description": "Use for loops, while loops, ranges, loop control, and accumulation patterns.",
        "focus_concepts": ["for loops", "while loops", "range", "accumulators"],
        "challenge": "Sum all even numbers from 1 through n."
    },
    {
        "title": "Lists, Tuples, and Sets",
        "description": "Store collections, index and slice lists, use common list methods, and remove duplicates with sets.",
        "focus_concepts": ["lists", "tuples", "sets", "indexing", "deduplication"],
        "challenge": "Return a sorted list of unique numbers from a space-separated input."
    },
    {
        "title": "Dictionaries and Data Lookup",
        "description": "Model key-value data, count frequencies, update dictionaries, and safely access missing keys.",
        "focus_concepts": ["dictionaries", "keys", "values", "get", "frequency counting"],
        "challenge": "Count word frequencies in a sentence."
    },
    {
        "title": "Functions and Reusable Logic",
        "description": "Define functions, pass parameters, return values, use default arguments, and isolate reusable behavior.",
        "focus_concepts": ["def", "parameters", "return", "scope"],
        "challenge": "Implement a reusable is_prime function."
    },
    {
        "title": "Errors, Files, and Modules",
        "description": "Handle exceptions, read/write files conceptually, import modules, and organize Python programs.",
        "focus_concepts": ["try/except", "files", "imports", "modules"],
        "challenge": "Safely parse integers and ignore invalid tokens."
    },
    {
        "title": "Object-Oriented Python and Final Practice",
        "description": "Understand classes, objects, methods, attributes, and combine course concepts in a small project.",
        "focus_concepts": ["classes", "objects", "methods", "attributes"],
        "challenge": "Create a small BankAccount class with deposit and withdraw behavior."
    },
]

GENERIC_CURRICULUM_BLUEPRINT = [
    {
        "title": item["title"].replace("Python", "Programming"),
        "description": item["description"].replace("Python", "programming"),
        "focus_concepts": item["focus_concepts"],
        "challenge": item["challenge"],
    }
    for item in PYTHON_CURRICULUM_BLUEPRINT
]

# ─── PYDANTIC RESPONSES SCHEMAS ────────────────────────────────────────

class TopicItem(pydantic.BaseModel):
    concept: str
    description: str
    start_seconds: int
    end_seconds: int

class TopicExtractionSchema(pydantic.BaseModel):
    topics: List[TopicItem]

class ModuleItem(pydantic.BaseModel):
    title: str
    description: str
    estimated_minutes: int
    focus_concepts: List[str]
    start_seconds: int
    end_seconds: int
    video_id: Optional[str]
    source_video_title: Optional[str]

class ModulePlanSchema(pydantic.BaseModel):
    overview: str
    modules: List[ModuleItem]

class QuizQuestionSchema(pydantic.BaseModel):
    question: str
    options: List[str]
    correct_option_index: int
    explanation: str

class QuizSchema(pydantic.BaseModel):
    questions: List[QuizQuestionSchema]

class TestCaseItem(pydantic.BaseModel):
    input: str
    expected_output: str

class CodingChallengeSchema(pydantic.BaseModel):
    title: str
    instructions: str
    starter_code: str
    solution_code: str
    programming_language: str
    test_cases: List[TestCaseItem]

# ─── REQUEST, TIMING, AND FEATURE NORMALIZATION ────────────────────────

def normalize_include_options(raw_include: Any) -> List[str]:
    if raw_include is None:
        raw_include = DEFAULT_ADVANCED_OPTIONS["include"]
    if isinstance(raw_include, str):
        raw_include = [raw_include]

    normalized = []
    for item in raw_include if isinstance(raw_include, list) else []:
        key = str(item).strip().lower().replace("-", "_")
        mapped = INCLUDE_ALIASES.get(key, key)
        if mapped and mapped not in normalized:
            normalized.append(mapped)
    return normalized or list(DEFAULT_ADVANCED_OPTIONS["include"])

def normalize_difficulty(value: Any, default: str = "medium") -> str:
    text = str(value or default).strip().lower()
    if "auto" in text:
        return default
    if text in {"easy", "beginner"}:
        return "easy"
    if text in {"hard", "advanced"}:
        return "hard"
    return "medium"

def parse_learning_minutes(value: Any, default_minutes: int = 120) -> int:
    if isinstance(value, (int, float)):
        return max(15, int(value))

    text = str(value or "").strip().lower()
    if not text:
        return default_minutes

    hour_match = re.search(r"(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)", text)
    minute_match = re.search(r"(\d+)\s*(m|min|mins|minute|minutes)", text)
    total = 0
    if hour_match:
        total += int(float(hour_match.group(1)) * 60)
    if minute_match:
        total += int(minute_match.group(1))
    if not total:
        number_match = re.search(r"\d+", text)
        total = int(number_match.group(0)) * 60 if number_match else default_minutes
    return max(15, total)

def parse_practice_minutes(value: Any, daily_minutes: int) -> int:
    text = str(value or DEFAULT_ADVANCED_OPTIONS["practice_time"]).lower()
    numbers = [int(n) for n in re.findall(r"\d+", text)]
    if not numbers:
        return min(30, max(10, daily_minutes // 4))
    practice = round(sum(numbers[:2]) / min(len(numbers), 2))
    return max(5, min(practice, max(5, daily_minutes - 15)))

def parse_start_date(value: Any) -> datetime.date:
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    text = str(value or "").strip()
    if not text:
        return datetime.date.today()
    try:
        return datetime.date.fromisoformat(text[:10])
    except ValueError:
        return datetime.date.today()

def normalize_generation_payload(task: CourseGenerationTask) -> Dict[str, Any]:
    try:
        payload = json.loads(task.request_payload_json or "{}")
    except Exception:
        payload = {}

    advanced = payload.get("advanced_options") or {}
    focus_areas = (
        advanced.get("focus_areas")
        or advanced.get("focusAreas")
        or payload.get("focusAreas")
        or DEFAULT_ADVANCED_OPTIONS["focus_areas"]
    )
    if not isinstance(focus_areas, list):
        focus_areas = [str(focus_areas)]

    custom_focus = payload.get("customFocus") or advanced.get("custom_focus") or ""
    if custom_focus and "Other" in focus_areas:
        focus_areas = [custom_focus if area == "Other" else area for area in focus_areas]

    daily_minutes = parse_learning_minutes(
        payload.get("daily_learning_time")
        or payload.get("dailyTime")
        or task.daily_learning_time_minutes
    )
    practice_time = (
        advanced.get("practice_time")
        or advanced.get("preferredPracticeTime")
        or payload.get("preferredPracticeTime")
        or DEFAULT_ADVANCED_OPTIONS["practice_time"]
    )

    normalized_advanced = {
        "focus_areas": [str(area) for area in focus_areas if str(area).strip()][:3],
        "include": normalize_include_options(
            advanced.get("include") or advanced.get("includes") or payload.get("includes")
        ),
        "difficulty": normalize_difficulty(advanced.get("difficulty") or payload.get("difficulty")),
        "language": str(
            advanced.get("language") or payload.get("language") or DEFAULT_ADVANCED_OPTIONS["language"]
        ),
        "question_complexity": str(
            advanced.get("question_complexity")
            or advanced.get("questionComplexity")
            or payload.get("questionComplexity")
            or DEFAULT_ADVANCED_OPTIONS["question_complexity"]
        ).lower(),
        "coding_difficulty": normalize_difficulty(
            advanced.get("coding_difficulty")
            or advanced.get("codingDifficulty")
            or payload.get("codingDifficulty")
        ),
        "weekend_learning": bool(
            advanced.get("weekend_learning")
            if "weekend_learning" in advanced
            else advanced.get("preferWeekend", payload.get("preferWeekend", False))
        ),
        "practice_time": str(practice_time),
        "practice_minutes": parse_practice_minutes(practice_time, daily_minutes),
        "preferred_start_time": str(
            advanced.get("preferred_start_time")
            or advanced.get("preferredStartTime")
            or payload.get("preferredStartTime")
            or DEFAULT_ADVANCED_OPTIONS["preferred_start_time"]
        ),
    }

    return {
        "youtube_url": payload.get("youtube_url") or payload.get("youtubeUrl") or task.youtube_url,
        "daily_learning_time": payload.get("daily_learning_time") or payload.get("dailyTime") or f"{daily_minutes // 60} hrs",
        "daily_learning_time_minutes": daily_minutes,
        "start_date": parse_start_date(payload.get("start_date") or payload.get("startDate") or task.start_date),
        "goals": payload.get("goals") or payload.get("learningGoal") or task.goals or "",
        "advanced_options": normalized_advanced,
    }

def course_expected_features(course: Course) -> Dict[str, bool]:
    try:
        options = json.loads(course.advanced_options_json or "{}")
    except Exception:
        options = {}
    includes = normalize_include_options(options.get("include") or options.get("includes"))
    return {
        "quiz": "quiz" in includes,
        "coding": "coding" in includes,
        "revision": "revision" in includes,
        "final_test": "final_test" in includes,
    }

def format_timestamp(seconds: int) -> str:
    seconds = max(0, int(seconds or 0))
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def human_duration(seconds: int) -> str:
    seconds = max(0, int(seconds or 0))
    hours, remainder = divmod(seconds, 3600)
    minutes = round(remainder / 60)
    if hours and minutes:
        return f"{hours}h {minutes}m"
    if hours:
        return f"{hours}h"
    return f"{minutes}m"

# ─── YOUTUBE UTILITIES ────────────────────────────────────────────────

def extract_youtube_id(url: str) -> Optional[str]:
    parsed = urllib.parse.urlparse(url)
    if parsed.hostname in ['www.youtube.com', 'youtube.com', 'm.youtube.com']:
        if parsed.path.startswith('/shorts/'):
            return parsed.path.split('/shorts/')[1].split('/')[0]
        if parsed.path.startswith('/embed/'):
            return parsed.path.split('/embed/')[1].split('/')[0]
        if parsed.path.startswith('/v/'):
            return parsed.path.split('/v/')[1].split('/')[0]
        q = urllib.parse.parse_qs(parsed.query)
        return q.get('v', [None])[0]
    elif parsed.hostname in ['youtu.be']:
        return parsed.path[1:].split('/')[0]
    return None

def extract_playlist_id(url: str) -> Optional[str]:
    parsed = urllib.parse.urlparse(url)
    q = urllib.parse.parse_qs(parsed.query)
    return q.get('list', [None])[0]

def build_youtube_thumbnail_url(video_id: str) -> str:
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

def fetch_youtube_oembed_metadata(video_id: str) -> Dict[str, Any]:
    oembed_url = (
        "https://www.youtube.com/oembed?url="
        f"https://www.youtube.com/watch?v={video_id}&format=json"
    )
    with urllib.request.urlopen(oembed_url, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload

def run_ytdlp_json(args: List[str]) -> Dict[str, Any]:
    """
    Runs yt-dlp in a Windows-safe way.

    Django's background worker may not inherit the shell PATH that contains
    yt-dlp.exe, so prefer the current Python environment's `yt_dlp` module.
    """
    module_cmd = [sys.executable, "-m", "yt_dlp", *args]
    module_error = None
    try:
        result = subprocess.run(
            module_cmd,
            capture_output=True,
            text=True,
            check=True,
            encoding="utf-8",
            timeout=45,
        )
    except subprocess.CalledProcessError as exc:
        module_error = exc
        missing_module = "no module named yt_dlp" in (exc.stderr or "").lower()
        if not missing_module:
            raise
    except subprocess.TimeoutExpired:
        raise
    except (OSError, FileNotFoundError):
        module_error = None
    if module_error is not None:
        result = None
    if module_error is not None or "result" not in locals():
        executable = shutil.which("yt-dlp") or shutil.which("yt-dlp.exe")
        if not executable:
            raise RuntimeError(
                "yt-dlp is not available in this Python environment. "
                "Install it with `python -m pip install -r requirements.txt`."
            ) from module_error
        result = subprocess.run(
            [executable, *args],
            capture_output=True,
            text=True,
            check=True,
            encoding="utf-8",
            timeout=45,
        )
    return json.loads(result.stdout)

def get_video_metadata(video_id: str) -> Dict[str, Any]:
    try:
        try:
            import yt_dlp
            ydl_opts = {
                'skip_download': True,
                'quiet': True,
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                data = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            requested_subtitles = data.get("requested_subtitles") or {}
            return {
                "title": data.get("title", "Untitled Tutorial"),
                "duration": int(data.get("duration", 3600)),
                "thumbnail": data.get("thumbnail") or build_youtube_thumbnail_url(video_id),
                "description": data.get("description", ""),
                "channel_name": data.get("channel") or data.get("uploader") or "",
                "language": data.get("language") or requested_subtitles.get("language") or "English",
            }
        except (ImportError, ModuleNotFoundError):
            data = run_ytdlp_json([
                "--dump-json",
                f"https://www.youtube.com/watch?v={video_id}",
            ])
            requested_subtitles = data.get("requested_subtitles") or {}
            return {
                "title": data.get("title", "Untitled Tutorial"),
                "duration": int(data.get("duration", 3600)),
                "thumbnail": data.get("thumbnail") or build_youtube_thumbnail_url(video_id),
                "description": data.get("description", ""),
                "channel_name": data.get("channel") or data.get("uploader") or "",
                "language": data.get("language") or requested_subtitles.get("language") or "English",
            }
    except Exception as e:
        print(f"yt-dlp metadata failed: {e}")
        try:
            oembed = fetch_youtube_oembed_metadata(video_id)
        except Exception as oembed_error:
            print(f"YouTube oEmbed metadata failed: {oembed_error}")
            oembed = {}
        return {
            "title": oembed.get("title") or "Programming Tutorial",
            "duration": 3600,
            "thumbnail": oembed.get("thumbnail_url") or build_youtube_thumbnail_url(video_id),
            "description": oembed.get("author_name") or "AI-Generated learning course.",
            "channel_name": oembed.get("author_name") or "",
            "language": "English",
        }

def is_python_course(course_title: str, text: str = "") -> bool:
    haystack = f"{course_title} {text[:4000]}".lower()
    # Explicitly check for python terms; avoid general terms like "programming" or "code"
    return any(token in haystack for token in ["python", "django", "flask", "pandas", "numpy", "pycharm", "fastapi"])

def deterministic_module_plan(course_title: str, transcript_text: str = "") -> Dict[str, Any]:
    # Dynamically detect the core technology from course_title and transcript
    detected_tech = "Programming"
    title_lower = course_title.lower()
    haystack = f"{title_lower} {transcript_text[:4000]}".lower()
    
    tech_mappings = {
        "python": "Python",
        "django": "Python/Django",
        "flask": "Python/Flask",
        "javascript": "JavaScript",
        "react": "React",
        "node": "Node.js",
        "typescript": "TypeScript",
        "java": "Java",
        "cpp": "C++",
        "c++": "C++",
        "c#": "C#",
        "html": "HTML/CSS",
        "css": "HTML/CSS",
        "sql": "SQL",
        "docker": "Docker",
        "kubernetes": "Kubernetes",
        "git": "Git",
    }
    
    for key, val in tech_mappings.items():
        if key in haystack:
            detected_tech = val
            break
            
    # Formulate a structured 10-module progressive curriculum tailored to the detected tech
    concepts = [
        ("Setup and First Steps", f"Configure environment and run your first {detected_tech} code.", ["Setup", "Environment"]),
        ("Variables and Data Types", f"Understand variables, scope, constants, and basic data types in {detected_tech}.", ["Variables", "Data Types"]),
        ("Control Flow and Logic", "Make decisions in code using conditionals, boolean logic, and branching.", ["Conditionals", "Logic"]),
        ("Loops and Iteration", "Perform repeating actions using loops, iterators, and control statements.", ["Loops", "Iteration"]),
        ("Functions and Scope", "Write reusable code blocks, manage parameters, and return values.", ["Functions", "Scope"]),
        ("Data Structures and Collections", "Organize data in arrays, lists, maps, or objects.", ["Collections", "Structures"]),
        ("Error Handling and Debugging", "Handle runtime exceptions and apply systematic debugging techniques.", ["Exceptions", "Debugging"]),
        ("Advanced Concepts", f"Explore advanced object-oriented, functional, or modular patterns in {detected_tech}.", ["Advanced Concepts"]),
        ("Working with External APIs/Data", "Fetch data from external resources, handle async/promise states, or read input data streams.", ["APIs", "Data Access"]),
        ("Building a Real Application", f"Combine all concepts to build and structure a complete {detected_tech} application project.", ["Project Architecture"]),
    ]
    
    return {
        "overview": f"A structured, hands-on learning path generated from {course_title}.",
        "modules": [
            {
                "title": f"{detected_tech} {title}",
                "description": desc,
                "estimated_minutes": 120,
                "focus_concepts": focus,
            }
            for title, desc, focus in concepts
        ]
    }

def extract_topic_keywords(text: str, limit: int = 4) -> List[str]:
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9_+#.-]{2,}", text.lower())
    weighted: Dict[str, int] = {}
    for token in tokens:
        normalized = token.strip(".,:;!?()[]{}")
        if not normalized or normalized in STOPWORDS:
            continue
        score = 3 if normalized in TECH_TERMS else 1
        weighted[normalized] = weighted.get(normalized, 0) + score
    ranked = sorted(weighted.items(), key=lambda item: (-item[1], item[0]))
    return [word.replace("_", " ").title() for word, _ in ranked[:limit]]

def derive_topic_from_text(text: str, fallback_title: str = "Concept Overview") -> str:
    keywords = extract_topic_keywords(text, limit=3)
    if keywords:
        return " & ".join(keywords[:2])
    title_words = extract_topic_keywords(fallback_title, limit=2)
    return " & ".join(title_words) if title_words else fallback_title

def target_module_count(total_seconds: int, topic_count: int, daily_minutes: int, practice_minutes: int) -> int:
    video_budget = max(25, daily_minutes - practice_minutes)
    duration_target = max(3, int((max(total_seconds, 1) / 60 + video_budget - 1) // video_budget))
    topic_target = max(3, min(topic_count, MAX_GENERATED_MODULES))
    return max(3, min(MAX_GENERATED_MODULES, max(duration_target, min(topic_target, duration_target + 3))))

def synthesize_topics_for_coverage(
    playlist_videos: List[Dict[str, Any]],
    course_title: str,
    daily_minutes: int,
    practice_minutes: int,
) -> List[Dict[str, Any]]:
    total_seconds = sum(int(video.get("duration") or 0) for video in playlist_videos) or 3600
    count = target_module_count(total_seconds, 0, daily_minutes, practice_minutes)
    dynamic_plan = deterministic_module_plan(course_title)
    blueprint = dynamic_plan["modules"]
    topics = []

    cursor_seconds = 0
    video_ranges = []
    for video_index, video in enumerate(playlist_videos):
        start = cursor_seconds
        duration = int(video.get("duration") or max(total_seconds // max(len(playlist_videos), 1), 900))
        video_ranges.append((video, video_index, start, start + duration))
        cursor_seconds += duration

    for idx in range(count):
        start_seconds = round(idx * total_seconds / count)
        end_seconds = round((idx + 1) * total_seconds / count)
        matched_video, matched_index, matched_start, _matched_end = video_ranges[min(idx, len(video_ranges) - 1)]
        for video, video_index, video_start, video_end in video_ranges:
            if video_start <= start_seconds < video_end:
                matched_video, matched_index, matched_start = video, video_index, video_start
                break

        blueprint_item = blueprint[idx % len(blueprint)]
        relative_start = max(0, start_seconds - matched_start)
        relative_end = max(relative_start + 60, end_seconds - matched_start)
        topics.append({
            "concept": derive_topic_from_text(
                f"{matched_video.get('title', '')} {matched_video.get('description', '')}",
                blueprint_item["title"],
            ) if idx == 0 else blueprint_item["title"],
            "description": blueprint_item["description"],
            "start_seconds": relative_start,
            "end_seconds": relative_end,
            "video_id": matched_video.get("video_id"),
            "video_index": matched_index,
            "video_title": matched_video.get("title", course_title),
        })
    return topics

def ensure_topic_coverage(
    topics: List[Dict[str, Any]],
    playlist_videos: List[Dict[str, Any]],
    course_title: str,
    daily_minutes: int,
    practice_minutes: int,
) -> List[Dict[str, Any]]:
    valid_topics = [
        topic for topic in topics
        if topic.get("video_id") and int(topic.get("end_seconds") or 0) > int(topic.get("start_seconds") or 0)
    ]
    total_seconds = sum(int(video.get("duration") or 0) for video in playlist_videos) or 3600
    minimum_count = target_module_count(total_seconds, len(valid_topics), daily_minutes, practice_minutes)
    if len(valid_topics) >= min(3, minimum_count):
        return valid_topics
    return synthesize_topics_for_coverage(playlist_videos, course_title, daily_minutes, practice_minutes)

def build_module_plan_from_topics(
    course_title: str,
    topics: List[Dict[str, Any]],
    focus_areas: List[str],
    daily_minutes: int = 120,
    practice_minutes: int = 30,
) -> Dict[str, Any]:
    ordered_topics = sorted(
        topics,
        key=lambda t: (
            int(t.get("video_index") or 0),
            int(t.get("start_seconds") or 0),
            int(t.get("end_seconds") or 0),
        ),
    )
    if not ordered_topics:
        return deterministic_module_plan(course_title)

    total_seconds = 0
    for topic in ordered_topics:
        total_seconds += max(60, int(topic.get("end_seconds") or 0) - int(topic.get("start_seconds") or 0))

    desired_count = target_module_count(total_seconds, len(ordered_topics), daily_minutes, practice_minutes)
    desired_count = min(desired_count, len(ordered_topics)) if len(ordered_topics) >= 3 else len(ordered_topics)
    desired_count = max(1, desired_count)
    topics_per_module = max(1, round(len(ordered_topics) / desired_count))

    groups = []
    current_group = []
    for topic in ordered_topics:
        if current_group and topic.get("video_id") != current_group[-1].get("video_id"):
            groups.append(current_group)
            current_group = []
        current_group.append(topic)
        span_seconds = max(
            0,
            int(current_group[-1].get("end_seconds") or 0) - int(current_group[0].get("start_seconds") or 0),
        )
        if len(groups) < desired_count - 1 and (
            len(current_group) >= topics_per_module
            or span_seconds >= max(20, daily_minutes - practice_minutes) * 60
        ):
            groups.append(current_group)
            current_group = []
    if current_group:
        groups.append(current_group)

    modules = []
    for idx, group in enumerate(groups[:MAX_GENERATED_MODULES]):
        concepts = []
        for topic in group:
            concept = str(topic.get("concept") or "Concept").strip()
            if concept and concept not in concepts:
                concepts.append(concept)

        first = group[0]
        last = group[-1]
        start_seconds = int(first.get("start_seconds") or 0)
        end_seconds = max(start_seconds + 60, int(last.get("end_seconds") or start_seconds + 60))
        video_minutes = max(10, round((end_seconds - start_seconds) / 60))
        title = concepts[0] if concepts else f"Module {idx + 1}"
        if idx == 0 and "intro" not in title.lower():
            title = f"{title} Foundations"
        elif len(concepts) > 1:
            title = f"{title} + {concepts[1]}"

        modules.append({
            "title": title[:120],
            "description": (
                f"Watch {format_timestamp(start_seconds)}-{format_timestamp(end_seconds)} "
                f"from {first.get('video_title', course_title)} and practice: {', '.join(concepts[:5])}."
            ),
            "estimated_minutes": video_minutes,
            "video_minutes": video_minutes,
            "focus_concepts": concepts[:6] or focus_areas[:3],
            "start_seconds": start_seconds,
            "end_seconds": end_seconds,
            "video_id": first.get("video_id"),
            "source_video_title": first.get("video_title", course_title),
            "timestamps": [
                {"seconds": start_seconds, "label": f"Start: {title[:80]}"},
                {"seconds": end_seconds, "label": f"Finish: {title[:80]}"},
            ],
            "topic_density": round(len(concepts) / max(video_minutes, 1), 3),
        })

    return {
        "overview": (
            f"A personalized learning path generated from '{course_title}' using transcript "
            f"timestamps, topic boundaries, and the requested focus areas: {', '.join(focus_areas[:3])}."
        ),
        "modules": modules,
    }

def apply_daily_roadmap(
    module_plan: Dict[str, Any],
    start_date: datetime.date,
    daily_minutes: int,
    advanced_options: Dict[str, Any],
) -> Dict[str, Any]:
    modules = module_plan.get("modules", [])
    includes = normalize_include_options(advanced_options.get("include"))
    practice_minutes = int(advanced_options.get("practice_minutes") or parse_practice_minutes(None, daily_minutes))
    coding_included = "coding" in includes
    quiz_included = "quiz" in includes
    revision_included = "revision" in includes
    weekend_learning = bool(advanced_options.get("weekend_learning"))
    scheduled_date = start_date

    for idx, module in enumerate(modules):
        concepts = module.get("focus_concepts") or []
        density = float(module.get("topic_density") or len(concepts) / max(module.get("video_minutes", 45), 1))
        complexity_boost = 1.15 if density > 0.08 or len(concepts) >= 4 else 1.0
        video_minutes = max(10, int(module.get("video_minutes") or module.get("estimated_minutes") or 45))
        quiz_minutes = 0
        if quiz_included:
            base_quiz = 12 if advanced_options.get("question_complexity") == "conceptual" else 18
            quiz_minutes = min(35, round(base_quiz * complexity_boost))

        challenge_minutes = 0
        if coding_included:
            diff = advanced_options.get("coding_difficulty", "medium")
            challenge_minutes = {"easy": 20, "medium": 30, "hard": 45}.get(diff, 30)

        revision_minutes = 10 if revision_included and (idx + 1) % 3 == 0 else 0
        daily_cap = daily_minutes + (round(daily_minutes * 0.35) if weekend_learning and scheduled_date.weekday() >= 5 else 0)
        total_minutes = min(
            max(video_minutes + quiz_minutes + challenge_minutes + revision_minutes, video_minutes),
            max(daily_cap, video_minutes),
        )

        module["estimated_minutes"] = total_minutes
        module["quiz_minutes"] = quiz_minutes
        module["challenge_minutes"] = challenge_minutes
        module["revision_minutes"] = revision_minutes
        module["learning_day"] = idx + 1
        module["scheduled_date"] = scheduled_date.isoformat()
        module["scheduled_time"] = advanced_options.get("preferred_start_time") or DEFAULT_SESSION_TIME
        module["daily_total_minutes"] = total_minutes

        scheduled_date += datetime.timedelta(days=1)

    module_plan["modules"] = modules
    module_plan["daily_learning_time_minutes"] = daily_minutes
    module_plan["practice_minutes"] = practice_minutes
    return module_plan

def normalize_module_plan(plan: Dict[str, Any], course_title: str, transcript_text: str = "") -> Dict[str, Any]:
    fallback = deterministic_module_plan(course_title, transcript_text)
    modules = plan.get("modules") if isinstance(plan, dict) else None
    if not isinstance(modules, list) or len(modules) < 3:
        return fallback

    normalized = []
    for idx, module in enumerate(modules[:10]):
        fallback_module = fallback["modules"][min(idx, len(fallback["modules"]) - 1)]
        focus = module.get("focus_concepts") if isinstance(module.get("focus_concepts"), list) else fallback_module["focus_concepts"]
        normalized.append({
            "title": module.get("title") or fallback_module["title"],
            "description": module.get("description") or fallback_module["description"],
            "estimated_minutes": int(module.get("estimated_minutes") or fallback_module["estimated_minutes"]),
            "focus_concepts": focus[:6] or fallback_module["focus_concepts"],
            "start_seconds": int(module.get("start_seconds") or 0),
            "end_seconds": int(module.get("end_seconds") or 0),
            "video_id": module.get("video_id"),
            "source_video_title": module.get("source_video_title"),
            "timestamps": module.get("timestamps") if isinstance(module.get("timestamps"), list) else [],
        })

    if len(normalized) < 10 and is_python_course(course_title, transcript_text):
        normalized.extend(fallback["modules"][len(normalized):10])

    return {
        "overview": plan.get("overview") or fallback["overview"],
        "modules": normalized,
    }

def fallback_quiz_questions(module_title: str, focus_concepts: List[str] = None) -> List[Dict[str, Any]]:
    concepts = focus_concepts or ["core concept"]
    primary = concepts[0]
    return [
        {
            "question": f"Which concept is most directly practiced in {module_title}?",
            "options": [primary, "CSS selectors", "Database indexing only", "Image compression"],
            "correct_option_index": 0,
            "explanation": f"{module_title} focuses on {primary} and related programming foundations."
        },
        {
            "question": "Why should code be split into small, testable steps?",
            "options": ["It makes logic easier to verify", "It prevents Python from running", "It removes the need for variables", "It only changes font size"],
            "correct_option_index": 0,
            "explanation": "Small steps make behavior clearer and easier to test."
        },
        {
            "question": "What is a useful habit when solving a programming exercise?",
            "options": ["Read inputs and expected outputs carefully", "Ignore edge cases", "Write random syntax first", "Delete all comments from tests"],
            "correct_option_index": 0,
            "explanation": "Understanding inputs, outputs, and edge cases leads to correct solutions."
        },
        {
            "question": f"How should you validate your understanding of {module_title}?",
            "options": ["Run examples and compare outputs", "Memorize only the title", "Skip practice problems", "Change the language setting"],
            "correct_option_index": 0,
            "explanation": "Running examples turns abstract ideas into observable behavior."
        },
    ]

def normalize_quiz_questions(questions: List[Dict[str, Any]], module_title: str, focus_concepts: List[str] = None) -> List[Dict[str, Any]]:
    source = questions if isinstance(questions, list) else []
    normalized = []
    for raw in source:
        options = raw.get("options") if isinstance(raw.get("options"), list) else []
        options = [str(option) for option in options if str(option).strip()]
        if len(options) < 4:
            continue
        correct = raw.get("correct_option_index", 0)
        if not isinstance(correct, int) or correct < 0 or correct >= len(options):
            correct = 0
        normalized.append({
            "question": raw.get("question") or raw.get("question_text") or f"Self-check on {module_title}?",
            "options": options[:4],
            "correct_option_index": correct,
            "explanation": raw.get("explanation", "Review the module notes for the reasoning.")
        })

    fallback = fallback_quiz_questions(module_title, focus_concepts)
    return (normalized + fallback)[:max(4, len(normalized))]

def fallback_coding_challenge(module_title: str, focus_concepts: List[str] = None) -> Dict[str, Any]:
    concepts = [c.lower() for c in (focus_concepts or [])]
    joined = " ".join(concepts + [module_title.lower()])
    
    # Detect programming language
    lang = "python"
    if any(token in joined for token in ["javascript", "js", "react", "node", "typescript", "ts"]):
        lang = "javascript"
    elif any(token in joined for token in ["cpp", "c++", "c"]):
        lang = "cpp"
    elif "java" in joined:
        lang = "java"
        
    # Generate language-specific starter and solution code templates
    if lang == "javascript":
        if "prime" in joined or "function" in joined:
            return {
                "title": f"{module_title}: Prime Checker",
                "instructions": "Implement a function `isPrime(n)` that returns `true` if `n` is prime, and `false` otherwise. The input will be passed to your function as a number.",
                "starter_code": "function isPrime(n) {\n    // Write your code here\n    return false;\n}\n",
                "solution_code": "function isPrime(n) {\n    if (n < 2) return false;\n    for (let i = 2; i <= Math.sqrt(n); i++) {\n        if (n % i === 0) return false;\n    }\n    return true;\n}\n",
                "programming_language": "javascript",
                "test_cases": [{"input": "7", "expected_output": "true", "hidden": False}, {"input": "12", "expected_output": "false", "hidden": True}],
            }
        if "dictionary" in joined or "frequency" in joined or "count" in joined:
            return {
                "title": f"{module_title}: Word Frequency",
                "instructions": "Implement a function `wordFrequency(text)` that returns an object containing word counts from the input string, where the keys are words in lowercase.",
                "starter_code": "function wordFrequency(text) {\n    // Write your code here\n    return {};\n}\n",
                "solution_code": "function wordFrequency(text) {\n    const counts = {};\n    const words = text.toLowerCase().split(/\\s+/);\n    for (const w of words) {\n        if (w) counts[w] = (counts[w] || 0) + 1;\n    }\n    return counts;\n}\n",
                "programming_language": "javascript",
                "test_cases": [{"input": "\"to be or to be\"", "expected_output": "{\"to\":2,\"be\":2,\"or\":1}", "hidden": False}, {"input": "\"React is great\"", "expected_output": "{\"react\":1,\"is\":1,\"great\":1}", "hidden": True}],
            }
        # Default javascript challenge
        return {
            "title": f"{module_title}: Practice Problem",
            "instructions": "Implement a function `solve(input)` that returns the input trimmed of leading/trailing whitespace.",
            "starter_code": "function solve(input) {\n    // Write your code here\n    return input;\n}\n",
            "solution_code": "function solve(input) {\n    return input.trim();\n}\n",
            "programming_language": "javascript",
            "test_cases": [{"input": "\"CodeCrux\"", "expected_output": "CodeCrux", "hidden": False}, {"input": "\"  JavaScript  \"", "expected_output": "JavaScript", "hidden": True}],
        }
        
    elif lang == "cpp":
        # C++ challenges
        if "prime" in joined or "function" in joined:
            return {
                "title": f"{module_title}: Prime Checker",
                "instructions": "Write a function `bool isPrime(int n)` that returns `true` if `n` is prime, and `false` otherwise.",
                "starter_code": "bool isPrime(int n) {\n    // Write your code here\n    return false;\n}\n",
                "solution_code": "bool isPrime(int n) {\n    if (n < 2) return false;\n    for (int i = 2; i * i <= n; i++) {\n        if (n % i == 0) return false;\n    }\n    return true;\n}\n",
                "programming_language": "cpp",
                "test_cases": [{"input": "7", "expected_output": "1", "hidden": False}, {"input": "12", "expected_output": "0", "hidden": True}],
            }
        return {
            "title": f"{module_title}: Practice Problem",
            "instructions": "Write a function `int solve(int n)` that returns double the input integer.",
            "starter_code": "int solve(int n) {\n    // Write your code here\n    return n;\n}\n",
            "solution_code": "int solve(int n) {\n    return n * 2;\n}\n",
            "programming_language": "cpp",
            "test_cases": [{"input": "5", "expected_output": "10", "hidden": False}, {"input": "12", "expected_output": "24", "hidden": True}],
        }
        
    elif lang == "java":
        # Java challenges
        if "prime" in joined or "function" in joined:
            return {
                "title": f"{module_title}: Prime Checker",
                "instructions": "Write a method `public static boolean isPrime(int n)` that checks if a number is prime.",
                "starter_code": "public class Solution {\n    public static boolean isPrime(int n) {\n        // Write your code here\n        return false;\n    }\n}\n",
                "solution_code": "public class Solution {\n    public static boolean isPrime(int n) {\n        if (n < 2) return false;\n        for (int i = 2; i <= Math.sqrt(n); i++) {\n            if (n % i == 0) return false;\n        }\n        return true;\n    }\n}\n",
                "programming_language": "java",
                "test_cases": [{"input": "7", "expected_output": "true", "hidden": False}, {"input": "12", "expected_output": "false", "hidden": True}],
            }
        return {
            "title": f"{module_title}: Practice Problem",
            "instructions": "Write a method `public static int solve(int n)` that returns double the input integer.",
            "starter_code": "public class Solution {\n    public static int solve(int n) {\n        // Write your code here\n        return n;\n    }\n}\n",
            "solution_code": "public class Solution {\n    public static int solve(int n) {\n        return n * 2;\n    }\n}\n",
            "programming_language": "java",
            "test_cases": [{"input": "5", "expected_output": "10", "hidden": False}, {"input": "12", "expected_output": "24", "hidden": True}],
        }

    # Python fallbacks (Default)
    if "prime" in joined or "function" in joined:
        return {
            "title": f"{module_title}: Prime Checker",
            "instructions": "Read one integer n and print True if n is prime, otherwise print False.",
            "starter_code": "# Write your code here\n# Read integer input and print True if prime, otherwise False\n",
            "solution_code": "n = int(input().strip())\nis_prime = True\nif n < 2:\n    is_prime = False\nelse:\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            is_prime = False\n            break\nprint(is_prime)",
            "programming_language": "python",
            "test_cases": [{"input": "7", "expected_output": "True", "hidden": False}, {"input": "12", "expected_output": "False", "hidden": True}],
        }
    if "dictionary" in joined or "frequency" in joined:
        return {
            "title": f"{module_title}: Word Frequency",
            "instructions": "Read a sentence and print the frequency of each word as word:count pairs sorted alphabetically.",
            "starter_code": "# Write your code here\n# Read sentence input and print word counts sorted alphabetically\n",
            "solution_code": "text = input().strip()\ncounts = {}\nfor word in text.lower().split():\n    counts[word] = counts.get(word, 0) + 1\nfor word, count in sorted(counts.items()):\n    print(f\"{word}:{count}\")",
            "programming_language": "python",
            "test_cases": [{"input": "to be or to be", "expected_output": "be:2\nor:1\nto:2", "hidden": False}, {"input": "Python python code", "expected_output": "code:1\npython:2", "hidden": True}],
        }
    if "class" in joined or "object" in joined:
        return {
            "title": f"{module_title}: Bank Account",
            "instructions": "Complete the BankAccount class so deposits add money and withdrawals subtract only when funds are available.",
            "starter_code": "# Complete the BankAccount class with deposit and withdraw\nclass BankAccount:\n    def __init__(self, balance=0):\n        self.balance = balance\n\n    def deposit(self, amount):\n        # Write your code here\n        pass\n\n    def withdraw(self, amount):\n        # Write your code here\n        pass\n",
            "solution_code": "class BankAccount:\n    def __init__(self, balance=0):\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n\n    def withdraw(self, amount):\n        if amount <= self.balance:\n            self.balance -= amount\n            return True\n        return False\n\naccount = BankAccount(100)\naccount.deposit(50)\nprint(account.withdraw(70))\nprint(account.balance)",
            "programming_language": "python",
            "test_cases": [{"input": "", "expected_output": "True\n80", "hidden": False}, {"input": "", "expected_output": "True\n80", "hidden": True}],
        }

    return {
        "title": f"{module_title}: Practice Problem",
        "instructions": "Read the input, transform it using the module concept, and print the expected output.",
        "starter_code": "# Write your code here\n# Read input and print the normalized output\n",
        "solution_code": "value = input().strip()\nprint(value)",
        "programming_language": "python",
        "test_cases": [{"input": "CodeCrux", "expected_output": "CodeCrux", "hidden": False}, {"input": "  Python  ", "expected_output": "Python", "hidden": True}],
    }

def normalize_coding_challenge(challenge: Optional[Dict[str, Any]], module_title: str, focus_concepts: List[str] = None) -> Dict[str, Any]:
    fallback = fallback_coding_challenge(module_title, focus_concepts)
    if not isinstance(challenge, dict):
        return fallback
    test_cases = challenge.get("test_cases") if isinstance(challenge.get("test_cases"), list) else []
    normalized_cases = []
    for case in test_cases:
        if not isinstance(case, dict):
            continue
        expected = case.get("expected_output", case.get("output", ""))
        normalized_cases.append({
            "input": str(case.get("input", "")),
            "expected_output": str(expected),
            "hidden": bool(case.get("hidden", case.get("isHidden", False))),
        })
    if len(normalized_cases) < 2:
        normalized_cases = fallback["test_cases"]

    return {
        "title": challenge.get("title") or fallback["title"],
        "instructions": challenge.get("instructions") or fallback["instructions"],
        "starter_code": challenge.get("starter_code") or fallback["starter_code"],
        "solution_code": challenge.get("solution_code") or fallback["solution_code"],
        "programming_language": (challenge.get("programming_language") or fallback["programming_language"]).lower(),
        "test_cases": normalized_cases,
    }

def has_complete_generated_content(course: Course) -> bool:
    modules = course.modules.all()
    expected = course_expected_features(course)
    if modules.count() < 3:
        return False
    for module in modules:
        if not module.timestamps.exists():
            return False
        if expected["quiz"]:
            if not module.quizzes.exists():
                return False
            quiz = module.quizzes.first()
            if quiz.questions.count() < 4:
                return False
            for question in quiz.questions.all():
                try:
                    options = json.loads(question.options_json or "[]")
                except Exception:
                    return False
                if len(options) < 4:
                    return False
        if expected["coding"]:
            if not module.coding_challenges.exists():
                return False
            challenge = module.coding_challenges.first()
            if not challenge.starter_code or not challenge.solution_code:
                return False
            try:
                test_cases = json.loads(challenge.test_cases_json or "[]")
                if len(test_cases) < 2:
                    return False
            except Exception:
                return False
    return True

def scrape_youtube_playlist_html(playlist_id: str) -> List[Dict[str, Any]]:
    playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
    try:
        req = urllib.request.Request(
            playlist_url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8')
            
        match = re.search(r'ytInitialData\s*=\s*({.+?});', html)
        if not match:
            match = re.search(r'ytInitialData\s*=\s*({.+?})\s*</script>', html)
            
        if not match:
            return []
            
        data = json.loads(match.group(1))
        videos = []
        entries = []
        try:
            tabs = data["contents"]["twoColumnBrowseResultsRenderer"]["tabs"]
            tab_content = tabs[0]["tabRenderer"]["content"]
            section_list = tab_content["sectionListRenderer"]["contents"]
            item_section = section_list[0]["itemSectionRenderer"]["contents"]
            playlist_renderer = item_section[0]["playlistVideoListRenderer"]
            entries = playlist_renderer["contents"]
        except Exception:
            def find_keys(d, key):
                if isinstance(d, dict):
                    if key in d:
                        yield d[key]
                    for v in d.values():
                        yield from find_keys(v, key)
                elif isinstance(d, list):
                    for item in d:
                        yield from find_keys(item, key)
                        
            renderers = list(find_keys(data, "playlistVideoRenderer"))
            if renderers:
                entries = [{"playlistVideoRenderer": r} for r in renderers]

        for entry in entries[:MAX_PLAYLIST_VIDEOS]:
            renderer = entry.get("playlistVideoRenderer")
            if not renderer:
                continue
                
            v_id = renderer.get("videoId")
            if not v_id:
                continue
                
            title = "Syllabus Lesson"
            try:
                title = renderer["title"]["runs"][0]["text"]
            except Exception:
                pass
                
            duration = 1800
            try:
                duration_str = renderer["lengthText"]["simpleText"]
                parts = list(map(int, duration_str.split(":")))
                if len(parts) == 2:
                    duration = parts[0] * 60 + parts[1]
                elif len(parts) == 3:
                    duration = parts[0] * 3600 + parts[1] * 60 + parts[2]
            except Exception:
                pass
                
            thumbnail = build_youtube_thumbnail_url(v_id)
            description = "AI-Generated learning course."
            try:
                description = renderer["descriptionSnippet"]["runs"][0]["text"]
            except Exception:
                pass
                
            channel_name = ""
            try:
                channel_name = renderer["shortBylineText"]["runs"][0]["text"]
            except Exception:
                pass
                
            videos.append({
                "video_id": v_id,
                "title": title,
                "duration": duration,
                "thumbnail": thumbnail,
                "description": description,
                "channel_name": channel_name,
                "language": "English",
            })
            
        return videos
    except Exception as e:
        print(f"HTML playlist scraping failed: {e}")
        return []

def get_playlist_videos(playlist_id: str) -> List[Dict[str, Any]]:
    playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
    try:
        try:
            # Fail-Safe 1: Try python yt_dlp package
            import yt_dlp
            ydl_opts = {
                'extract_flat': True,
                'skip_download': True,
                'quiet': True,
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                data = ydl.extract_info(playlist_url, download=False)
            entries = data.get("entries", [])
            
            videos = []
            for entry in entries[:MAX_PLAYLIST_VIDEOS]:
                if entry.get("id"):
                    videos.append({
                        "video_id": entry.get("id"),
                        "title": entry.get("title", "Syllabus Lesson"),
                        "duration": int(entry.get("duration", 1800)) if entry.get("duration") else 1800,
                        "thumbnail": entry.get("thumbnail") or build_youtube_thumbnail_url(entry.get("id", "")),
                        "description": entry.get("description", ""),
                        "channel_name": entry.get("channel") or entry.get("uploader") or "",
                        "language": entry.get("language") or "English",
                    })
            return videos
        except (ImportError, ModuleNotFoundError):
            try:
                # Fail-Safe 2: Fallback to system command-line subprocess
                data = run_ytdlp_json([
                    "--flat-playlist",
                    "--dump-single-json",
                    playlist_url,
                ])
                entries = data.get("entries", [])
                
                videos = []
                for entry in entries[:MAX_PLAYLIST_VIDEOS]:
                    if entry.get("id"):
                        videos.append({
                            "video_id": entry.get("id"),
                            "title": entry.get("title", "Syllabus Lesson"),
                            "duration": int(entry.get("duration", 1800)) if entry.get("duration") else 1800,
                            "thumbnail": entry.get("thumbnail") or build_youtube_thumbnail_url(entry.get("id", "")),
                            "description": entry.get("description", ""),
                            "channel_name": entry.get("channel") or entry.get("uploader") or "",
                            "language": entry.get("language") or "English",
                        })
                return videos
            except Exception as e:
                print(f"yt-dlp command-line subprocess playlist extraction failed: {e}")
                # Fail-Safe 3: Lightweight, 100% dependency-free public playlist page scraping fallback
                print("Running Fail-Safe 3: Native HTML playlist parser...")
                return scrape_youtube_playlist_html(playlist_id)
    except Exception as e:
        print(f"Playlist extraction failed completely: {e}")
        return []

def clean_transcript_text(text: str) -> str:
    text = re.sub(r'Kind: captions.*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Language: en.*', '', text, flags=re.IGNORECASE)
    sponsor_keywords = ['sponsor', 'dashlane', 'nordvpn', 'squarespace', 'brilliant.org', 'audible']
    for keyword in sponsor_keywords:
        text = re.sub(r"([^.!?]*" + re.escape(keyword) + r"[^.!?]*[.!?])", "", text, flags=re.IGNORECASE)
    text = re.sub(r'(hi|hello|hey) (everybody|everyone|guys|folks)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'(thanks for watching|see you in the next video)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\d{2}:\d{2}:\d{2}.\d{3} --> \d{2}:\d{2}:\d{2}.\d{3}', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def download_transcript(video_id: str) -> Tuple[str, List[Dict[str, Any]]]:
    raw_segments = []
    try:
        raw_segments = YouTubeTranscriptApi().fetch(video_id, languages=['en', 'en-US'])
    except Exception as e:
        try:
            raw_segments = YouTubeTranscriptApi().fetch(video_id)
        except Exception as e2:
            print(f"YouTube transcript failed: {e2}")
            raw_segments = [{"text": "Course tutorial introduction and coding basics.", "start": 0.0, "duration": 60.0}]

    cleaned_segments = []
    full_text_list = []
    for seg in raw_segments:
        seg_text = getattr(seg, 'text', '') if not isinstance(seg, dict) else seg.get('text', '')
        seg_start = getattr(seg, 'start', 0) if not isinstance(seg, dict) else seg.get('start', 0)
        seg_duration = getattr(seg, 'duration', 0) if not isinstance(seg, dict) else seg.get('duration', 0)
        text = clean_transcript_text(seg_text)
        if text:
            cleaned_segments.append({
                "text": text,
                "start": int(seg_start),
                "duration": int(seg_duration)
            })
            full_text_list.append(text)
            
    return " ".join(full_text_list), cleaned_segments

# ─── SEMANTIC CHUNKING UTILITY ────────────────────────────────────────

def semantic_chunk_transcript(segments: List[Dict[str, Any]], max_words: int = 1500) -> List[Dict[str, Any]]:
    chunks = []
    current_chunk_text = []
    current_word_count = 0
    start_time = 0
    last_end_time = 0
    max_duration_seconds = 8 * 60

    topic_transition_pattern = re.compile(
        r"\b(next|now|let'?s|we will|we are going to|chapter|section|module|topic|project|exercise|recap)\b",
        re.IGNORECASE,
    )
    
    for seg in segments:
        words = seg["text"].split()
        seg_start = int(seg.get("start", 0))
        seg_duration = int(seg.get("duration", 0) or 0)
        seg_end = max(seg_start + seg_duration, seg_start + 1)
        gap_seconds = seg_start - last_end_time
        current_span = last_end_time - start_time
        starts_new_topic = bool(current_chunk_text and topic_transition_pattern.search(seg["text"][:120]))
        natural_boundary = (
            gap_seconds >= 12
            or current_span >= max_duration_seconds
            or (starts_new_topic and current_span >= 120)
        )
        safety_boundary = current_word_count + len(words) > max_words * 2 and current_chunk_text

        if (natural_boundary or safety_boundary) and current_chunk_text:
            end_time = max(last_end_time, seg_start)
            chunks.append({
                "text": " ".join(current_chunk_text),
                "start_seconds": start_time,
                "end_seconds": end_time
            })
            current_chunk_text = [seg["text"]]
            current_word_count = len(words)
            start_time = seg_start
        else:
            if not current_chunk_text:
                start_time = seg_start
            current_chunk_text.append(seg["text"])
            current_word_count += len(words)
        last_end_time = seg_end
            
    if current_chunk_text:
        chunks.append({
            "text": " ".join(current_chunk_text),
            "start_seconds": start_time,
            "end_seconds": max(last_end_time, start_time + 60)
        })
        
    return chunks

def get_transcript_for_timestamp_range(video_id: str, start_seconds: int, end_seconds: int) -> str:
    """
    Retrieves the segment of the transcript overlapping with the module's timeframe.
    """
    cached_trans = VideoTranscript.objects.filter(youtube_video_id=video_id).first()
    if not cached_trans:
        return ""
        
    try:
        chunks = json.loads(cached_trans.processed_chunks_json or "[]")
        matched_texts = []
        for chunk in chunks:
            c_start = int(chunk.get("start_seconds") or 0)
            c_end = int(chunk.get("end_seconds") or 0)
            # Check overlap between [c_start, c_end] and [start_seconds, end_seconds]
            if max(c_start, start_seconds) < min(c_end, end_seconds):
                matched_texts.append(chunk.get("text", ""))
        if matched_texts:
            return " ".join(matched_texts)
    except Exception as e:
        print(f"Error parsing processed_chunks_json: {e}")
        
    return cached_trans.full_transcript[:10000]

# ─── GEMINI PROMPTING PIPELINE ────────────────────────────────────────

# Model RPM limits mapping (with a safe margin to protect the free tier budget)
MODEL_RPM_LIMITS = {
    "gemini-2.5-flash": 10,
    "gemini-2.0-flash": 10,
    "gemini-2.0-flash-lite": 15,
    "gemini-1.5-flash": 15,
}

# Tracks scheduled execution timestamps per model (includes future-scheduled times)
REQUEST_TIMESTAMPS_BY_MODEL = {}

# Round-robin counter for model distribution
_MODEL_ROUND_ROBIN_COUNTER = 0

async def throttle_request(model_name: str):
    """
    Sliding-window rate limiter that correctly handles concurrent scheduling.
    Instead of appending future timestamps that poison the window, this tracks
    actual execution slots and properly staggers concurrent requests.
    """
    sleep_needed = 0.0
    async with RATE_LIMIT_LOCK:
        limit = MODEL_RPM_LIMITS.get(model_name, 4)
        now = time.time()

        if model_name not in REQUEST_TIMESTAMPS_BY_MODEL:
            REQUEST_TIMESTAMPS_BY_MODEL[model_name] = []

        scheduled = sorted(REQUEST_TIMESTAMPS_BY_MODEL[model_name])
        # Prune entries older than 120s to prevent unbounded growth
        scheduled = [t for t in scheduled if t > now - 120.0]

        if len(scheduled) >= limit:
            # Find when the window can accept a new request:
            # The (len - limit)th timestamp will expire at t + 60s
            window_opens_at = scheduled[-limit] + 60.0
            # Also ensure minimum spacing from the last scheduled request
            min_gap = 60.0 / (limit + 1)  # ~12s for limit=4
            last_scheduled = scheduled[-1] if scheduled else now
            spaced_at = last_scheduled + min_gap
            # Take the later of window-based and spacing-based times
            earliest_allowed = max(window_opens_at, spaced_at)
            if earliest_allowed > now:
                sleep_needed = earliest_allowed - now
            planned_time = max(now, earliest_allowed)
        else:
            # Window has capacity, but still enforce minimum spacing
            if scheduled:
                min_gap = 60.0 / (limit + 1)
                last_scheduled = scheduled[-1]
                spaced_at = last_scheduled + min_gap
                if spaced_at > now:
                    sleep_needed = spaced_at - now
                    planned_time = spaced_at
                else:
                    planned_time = now
            else:
                planned_time = now

        scheduled.append(planned_time)
        REQUEST_TIMESTAMPS_BY_MODEL[model_name] = scheduled

    if sleep_needed > 0:
        print(f"[Throttle] {model_name}: waiting {sleep_needed:.1f}s (RPM safety)")
        await asyncio.sleep(sleep_needed)

async def generate_with_model_fallback(
    system_instruction: str,
    prompt: str,
    generation_config: Optional[Dict[str, Any]] = None,
    retries_per_model: int = 2
) -> Any:
    """
    Generates content using a pool of active models with round-robin distribution.
    Each call starts with a different model to spread load evenly across both models'
    RPM budgets, effectively doubling throughput vs. always-first-model approach.
    Falls back to the next model on rate limit errors.
    """
    global _MODEL_ROUND_ROBIN_COUNTER
    last_exception = None

    model_pool = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
    ]

    # Round-robin: rotate starting model each call
    start_idx = _MODEL_ROUND_ROBIN_COUNTER % len(model_pool)
    _MODEL_ROUND_ROBIN_COUNTER += 1
    ordered_pool = model_pool[start_idx:] + model_pool[:start_idx]

    for model_name in ordered_pool:
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction
            )
            response = await async_generate_content_with_retry(
                model,
                prompt,
                generation_config=generation_config,
                retries=retries_per_model
            )
            return response
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "limit" in err_str or "exhausted" in err_str:
                print(f"[ModelPool] {model_name} rate-limited, rotating to next model...")
                last_exception = e
                continue
            else:
                raise e

    if last_exception:
        raise last_exception
    raise Exception("No active models available for generation.")

def robust_json_loads(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        newline_idx = text.find("\n")
        if newline_idx != -1:
            text = text[newline_idx:].strip()
        if text.endswith("```"):
            text = text[:-3].strip()
            
    start_brace = text.find("{")
    end_brace = text.rfind("}")
    start_bracket = text.find("[")
    end_bracket = text.rfind("]")
    
    start_idx = -1
    end_idx = -1
    if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
        start_idx = start_brace
        end_idx = end_brace
    elif start_bracket != -1:
        start_idx = start_bracket
        end_idx = end_bracket
        
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        text = text[start_idx:end_idx+1]
        
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    cleaned = []
    in_string = False
    i = 0
    n = len(text)
    while i < n:
        char = text[i]
        
        if char == '\\':
            if i + 1 < n:
                next_char = text[i + 1]
                cleaned.append('\\')
                cleaned.append(next_char)
                i += 2
                continue
            else:
                cleaned.append('\\')
                i += 1
                continue
                
        if char == '"':
            if in_string:
                j = i + 1
                while j < n and text[j].isspace():
                    j += 1
                is_closing = (j == n or text[j] in {',', '}', ']', ':'})
                if is_closing:
                    in_string = False
                    cleaned.append('"')
                else:
                    cleaned.append('\\"')
            else:
                in_string = True
                cleaned.append('"')
            i += 1
            continue
            
        if in_string:
            if char == '\n':
                cleaned.append('\\n')
            elif char == '\r':
                cleaned.append('\\r')
            elif char == '\t':
                cleaned.append('\\t')
            else:
                cleaned.append(char)
        else:
            cleaned.append(char)
        i += 1
        
    cleaned_text = "".join(cleaned)
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        print(f"Sanitized JSON parsing failed: {e}")
        final_clean = text.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
        try:
            return json.loads(final_clean)
        except Exception:
            raise e

async def async_generate_content_with_retry(model, prompt, generation_config=None, retries=3, backoff_factor=2.0):
    model_name = getattr(model, "model_name", "gemini-3.1-flash-lite").replace("models/", "")
    for attempt in range(retries):
        try:
            await throttle_request(model_name)
            
            if generation_config:
                return await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                )
            else:
                return await asyncio.to_thread(model.generate_content, prompt)
        except Exception as e:
            err_str = str(e).lower()
            if ("429" in err_str or "quota" in err_str or "limit" in err_str or "exhausted" in err_str) and attempt < retries - 1:
                sleep_time = (backoff_factor ** attempt) + 2.0
                print(f"[Retry] {model_name} rate-limited, backing off {sleep_time:.0f}s (attempt {attempt + 1}/{retries})")
                await asyncio.sleep(sleep_time)
            else:
                raise e

async def summarize_large_transcript(video_title: str, text: str) -> str:
    if not GEMINI_API_KEY:
        return text[:5000]
    async with SEMAPHORE:
        try:
            prompt = f"""
            Summarize the following raw transcript from the video: "{video_title}".
            Retain all technical keywords, APIs, coding setups, and concepts taught in the video.
            Ensure it is concise and fits within a high-density learning summary.
            
            Raw Transcript:
            {text[:50000]}
            """
            response = await generate_with_model_fallback(
                system_instruction="You are a precise technical documentarian specializing in summarizing coding tutorials and software engineering courses.",
                prompt=prompt
            )
            return response.text
        except Exception as e:
            print(f"Transcript summarization failed: {e}")
            return text[:10000]

async def extract_semantic_topics(chunk: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        concept = derive_topic_from_text(chunk.get("text", ""), chunk.get("title", "Concept Overview"))
        return [{
            "concept": concept,
            "description": f"Transcript segment covering {concept}.",
            "start_seconds": chunk["start_seconds"],
            "end_seconds": chunk["end_seconds"],
        }]
        
    async with SEMAPHORE:
        try:
            prompt = f"""
            Analyze the following transcript slice from a programming course.
            Extract exactly 2 to 4 core, separate technical concepts taught in this slice.
            For each concept, specify the approximate timestamp span.
            
            Time Span: {chunk['start_seconds']}s to {chunk['end_seconds']}s
            Transcript:
            {chunk['text'][:4000]}
            """
            
            response = await generate_with_model_fallback(
                system_instruction="You are an expert curriculum planner and transcript analyzer.",
                prompt=prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": TopicExtractionSchema
                }
            )
            data = robust_json_loads(response.text)
            return data.get("topics", [])
        except Exception as e:
            print(f"Gemini topic extraction failed: {e}")
            concept = derive_topic_from_text(chunk.get("text", ""), chunk.get("title", "Concept Overview"))
            return [{"concept": concept, "description": f"Transcript segment covering {concept}.", "start_seconds": chunk["start_seconds"], "end_seconds": chunk["end_seconds"]}]

async def plan_module_structure(
    course_title: str,
    topics: List[Dict[str, Any]],
    focus_areas: List[str],
    daily_minutes: int = 120,
    practice_minutes: int = 30,
) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        return build_module_plan_from_topics(course_title, topics, focus_areas, daily_minutes, practice_minutes)
        
    async with SEMAPHORE:
        try:
            topics_by_video = {}
            for t in topics:
                v_title = t.get("video_title", "General Video")
                if v_title not in topics_by_video:
                    topics_by_video[v_title] = []
                topics_by_video[v_title].append(t)

            topics_summary_parts = []
            for v_title, v_topics in topics_by_video.items():
                topics_summary_parts.append(f"\n--- Source Video: {v_title} ---")
                for t in v_topics:
                    topics_summary_parts.append(f"- {t['concept']}: {t['description']} (starts around {t['start_seconds']}s)")
            
            topics_summary = "\n".join(topics_summary_parts)
            
            prompt = f"""
            You are a lead curriculum architect designing a custom sequenced syllabus map.
            Course Title: {course_title}
            Focus Preferences: {', '.join(focus_areas)}
            
            Here are the separate technical concepts extracted from each video sequentially:
            {topics_summary}
            
            Group these concepts into the right number of logical daily course modules (3 to {MAX_GENERATED_MODULES}).
            The modules MUST be sequenced in chronological order of the source videos to ensure a progressive learning path.
            Do NOT merge unrelated video topics. Map each module to the relevant source video concepts.
            For each module, define a title, details, focus concepts, estimated minutes,
            source video ID, start_seconds, and end_seconds. The timestamp span must tell the
            learner exactly what part of the YouTube video to watch for that module.
            """
            
            response = await generate_with_model_fallback(
                system_instruction="You are a lead curriculum architect designing a custom sequenced syllabus map.",
                prompt=prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": ModulePlanSchema
                }
            )
            topic_text = " ".join([f"{t.get('concept', '')} {t.get('description', '')}" for t in topics])
            ai_plan = normalize_module_plan(robust_json_loads(response.text), course_title, topic_text)
            if any(not m.get("start_seconds") and not m.get("end_seconds") for m in ai_plan.get("modules", [])):
                return build_module_plan_from_topics(course_title, topics, focus_areas, daily_minutes, practice_minutes)
            return ai_plan
        except Exception as e:
            print(f"Module plan failed: {e}")
            return build_module_plan_from_topics(course_title, topics, focus_areas, daily_minutes, practice_minutes)

async def generate_quiz_content(module_title: str, description: str, difficulty: str, transcript: str = "") -> List[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        return fallback_quiz_questions(module_title)
        
    mcq_count = 5
    if difficulty.lower() == 'medium':
        mcq_count = 10
    elif difficulty.lower() == 'hard':
        mcq_count = 15
        
    async with SEMAPHORE:
        try:
            transcript_section = f"\nVideo Transcript Content:\n{transcript[:15000]}" if transcript else ""
            
            prompt = f"""
            Create exactly {mcq_count} multiple choice questions (MCQs) for the topic: "{module_title}".
            Module Details: {description}
            Difficulty Level: {difficulty}
            {transcript_section}
            
            Each question MUST contain:
            - question text
            - array of 4 options (Index 0 = A, 1 = B, etc.)
            - correct_option_index (0, 1, 2, or 3)
            - detailed explanation
            
            INSTRUCTIONS:
            1. Ensure all questions are directly derived from the concepts discussed in the provided Video Transcript Content.
            2. Make options clear and unambiguous.
            3. CRITICAL: Never use raw double quotes inside JSON string fields (like question, options, or explanation). If you need to write code terms, strings, or quote text, ALWAYS use single quotes (e.g., 'self' or 'Hello') instead.
            """
            
            response = await generate_with_model_fallback(
                system_instruction="You are an elite developer and computer science instructor creating course assessments.",
                prompt=prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": QuizSchema
                }
            )
            return normalize_quiz_questions(robust_json_loads(response.text).get("questions", []), module_title)
        except Exception as e:
            print(f"Quiz generation failed: {e}")
            return fallback_quiz_questions(module_title)

async def generate_coding_challenge_content(module_title: str, focus_concepts: List[str], challenge_diff: str, transcript: str = "") -> Optional[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        return fallback_coding_challenge(module_title, focus_concepts)
        
    async with SEMAPHORE:
        try:
            transcript_section = f"\nVideo Transcript Content:\n{transcript[:15000]}" if transcript else ""
            
            prompt = f"""
            Design a coding exercise for: "{module_title}".
            Concepts to verify: {', '.join(focus_concepts)}
            Challenge Difficulty: {challenge_diff}
            {transcript_section}
            
            The response MUST contain:
            - Challenge title
            - Instructions/Problem description (markdown)
            - starter_code (clean template)
            - solution_code (working implementation)
            - programming_language (always lowercase 'python', 'javascript', 'cpp', or 'java')
            - test_cases array with input and expected_output fields
            
            INSTRUCTIONS:
            1. The programming language and concepts MUST be directly derived from the provided Video Transcript Content. For example, if the video teaches JavaScript/React, design the challenge in JavaScript. If it teaches Python, design it in Python. If it is generic programming, default to Python or JavaScript.
            2. The instructions should explain the problem clearly and tell the student what inputs are expected and what output to print.
            3. The test cases must match the starter/solution template's input and output formats exactly.
            4. CRITICAL: Never use raw double quotes inside any JSON string fields. If you need to define string literals in starter_code or solution_code, use single quotes (e.g., 'hello') or escape them as \\" so the JSON remains perfectly valid.
            """
            
            response = await generate_with_model_fallback(
                system_instruction="You are an expert tech interviewer and coding challenge curator.",
                prompt=prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": CodingChallengeSchema
                }
            )
            return normalize_coding_challenge(robust_json_loads(response.text), module_title, focus_concepts)
        except Exception as e:
            print(f"Challenge generation failed: {e}")
            return fallback_coding_challenge(module_title, focus_concepts)

# ─── CORE ASYNC WORKER TASK PROCESSOR ──────────────────────────────────

async def process_generation_pipeline(task_id: str):
    task = CourseGenerationTask.objects.filter(id=task_id).first()
    if not task:
        return
        
    task.status = 'processing'
    task.progress = 5
    task.current_step = 'Validating YouTube URL...'
    task.save()
    
    steps = {}
    
    def log_step(name: str, status: str, progress: int, error: str = None, cache: str = None):
        step, created = CourseGenerationStep.objects.get_or_create(
            task_id=task_id,
            step_name=name
        )
        step.status = status
        step.progress = progress
        if status == 'running':
            step.started_at = timezone.now()
        elif status in ['completed', 'failed']:
            step.completed_at = timezone.now()
        if error:
            step.error_message = error
            task.status = 'failed'
            task.current_step = f"Error in {name}: {error}"
            task.save()
        if cache:
            step.cached_output = cache
        step.save()
            
        task.progress = max(task.progress, progress)
        if status == 'failed':
            task.status = 'failed'
            task.current_step = f"Error in {name}: {error or 'Course generation failed.'}"
        else:
            task.current_step = f"Completed step: {name}" if status == 'completed' else f"Running step: {name}"
        task.save()
        steps[name] = step
        
    try:
        request = normalize_generation_payload(task)
        advanced_options = request["advanced_options"]
        daily_minutes = request["daily_learning_time_minutes"]
        practice_minutes = int(advanced_options.get("practice_minutes") or 30)
        includes = normalize_include_options(advanced_options.get("include"))

        # Step 1: Normalize URL & check for duplicate courses
        log_step('url_processing', 'running', 10)
        url = request["youtube_url"]
        video_id = extract_youtube_id(url)
        playlist_id = extract_playlist_id(url)
        
        duplicate_course = None
        if playlist_id:
            duplicate_course = Course.objects.filter(
                instructor_id=task.user_id,
                youtube_playlist_id=playlist_id
            ).first()
        elif video_id:
            duplicate_course = Course.objects.filter(
                instructor_id=task.user_id,
                youtube_video_id=video_id
            ).first()
            
        if duplicate_course:
            if has_complete_generated_content(duplicate_course):
                task.status = 'completed'
                task.progress = 100
                task.course_id = duplicate_course.id
                task.current_step = 'Course already exists. Resume existing?'
                task.save()
                log_step('url_processing', 'completed', 100)
                return
            duplicate_course.delete()

        log_step('url_processing', 'completed', 12, cache=json.dumps({
            "video_id": video_id,
            "playlist_id": playlist_id,
        }))
            
        # Parse Playlist elements
        log_step('metadata_extraction', 'running', 18)
        playlist_videos = []
        if playlist_id:
            playlist_videos = get_playlist_videos(playlist_id)
            if not playlist_videos:
                raise Exception("Could not fetch elements from the requested playlist ID.")
        elif video_id:
            metadata = get_video_metadata(video_id)
            playlist_videos = [{
                "video_id": video_id,
                "title": metadata["title"],
                "duration": metadata["duration"],
                "thumbnail": metadata["thumbnail"],
                "description": metadata.get("description", ""),
                "channel_name": metadata.get("channel_name", ""),
                "language": metadata.get("language", "English"),
            }]
        else:
            raise Exception("Invalid YouTube video or playlist link provided.")
            
        log_step('metadata_extraction', 'completed', 20, cache=json.dumps(playlist_videos))
        
        # Step 2: Individual Video Transcripts Caching & Semantic Chunking
        log_step('transcript_extraction', 'running', 25)
        
        all_video_chunks = []
        course_duration = 0
        transcripts_to_save = []
        
        for video_index, p_video in enumerate(playlist_videos):
            v_id = p_video["video_id"]
            course_duration += int(p_video.get("duration") or 0)
            
            cached_trans = VideoTranscript.objects.filter(youtube_video_id=v_id).first()
            if cached_trans:
                full_text = cached_trans.full_transcript
                chunks = json.loads(cached_trans.processed_chunks_json or "[]")
                
                # Derive true duration from cached chunks if metadata was truncated
                if chunks:
                    transcript_max_time = max(
                        int(c.get("end_seconds") or (int(c.get("start_seconds") or 0) + 60))
                        for c in chunks
                    )
                    metadata_duration = int(p_video.get("duration") or 0)
                    if transcript_max_time > metadata_duration:
                        correction = transcript_max_time - metadata_duration
                        p_video["duration"] = transcript_max_time
                        course_duration += correction
            else:
                full_text, segs = download_transcript(v_id)
                
                # Derive true duration from transcript segments
                # This fixes the case where yt-dlp fails and metadata falls back to 3600s
                if segs:
                    transcript_max_time = max(
                        int(s.get("start") or 0) + int(s.get("duration") or 0)
                        for s in segs
                    )
                    metadata_duration = int(p_video.get("duration") or 0)
                    if transcript_max_time > metadata_duration:
                        correction = transcript_max_time - metadata_duration
                        p_video["duration"] = transcript_max_time
                        course_duration += correction
                
                word_count = len(full_text.split())
                if word_count > MAX_TRANSCRIPT_WORDS:
                    full_text = await summarize_large_transcript(p_video["title"], full_text)
                    segs = [{"text": full_text, "start": 0, "duration": p_video["duration"]}]
                    
                chunks = semantic_chunk_transcript(segs, max_words=1500)
                
            transcripts_to_save.append({
                "youtube_url": f"https://www.youtube.com/watch?v={v_id}",
                "youtube_video_id": v_id,
                "full_transcript": full_text,
                "processed_chunks_json": json.dumps(chunks)
            })
                
            for chunk in chunks:
                all_video_chunks.append({
                    "video_id": v_id,
                    "video_index": video_index,
                    "title": p_video["title"],
                    **chunk
                })
                
        total_chunks_words = sum(len(c["text"].split()) for c in all_video_chunks)
        if total_chunks_words > MAX_TRANSCRIPT_WORDS:
            for chunk in all_video_chunks:
                if len(chunk["text"].split()) > 1000:
                    chunk["text"] = chunk["text"][:3000]
                    
        log_step('transcript_extraction', 'completed', 30, cache=json.dumps(all_video_chunks))
        
        # Step 3: Topic extraction per video chunk
        log_step('topic_extraction', 'running', 45)
        
        topic_futures = [extract_semantic_topics(chunk) for chunk in all_video_chunks]
        extracted_topics_lists = await asyncio.gather(*topic_futures)
        
        merged_topics = []
        for idx, v_topics in enumerate(extracted_topics_lists):
            chunk = all_video_chunks[idx]
            for topic in v_topics:
                topic["video_id"] = chunk["video_id"]
                topic["video_index"] = chunk.get("video_index", 0)
                topic["video_title"] = chunk["title"]
                merged_topics.append(topic)

        merged_topics = ensure_topic_coverage(
            merged_topics,
            playlist_videos,
            playlist_videos[0]["title"],
            daily_minutes,
            practice_minutes,
        )
            
        log_step('topic_extraction', 'completed', 40, cache=json.dumps(merged_topics))
        
        # Step 4: Modules & roadmap divisions planning
        log_step('module_generation', 'running', 50)
        
        module_plan = await plan_module_structure(
            course_title=playlist_videos[0]["title"],
            topics=merged_topics,
            focus_areas=advanced_options.get("focus_areas") or DEFAULT_ADVANCED_OPTIONS["focus_areas"],
            daily_minutes=daily_minutes,
            practice_minutes=practice_minutes,
        )

        module_plan = apply_daily_roadmap(
            module_plan,
            request["start_date"],
            daily_minutes,
            advanced_options,
        )
        
        log_step('module_generation', 'completed', 50, cache=json.dumps(module_plan))

        log_step('roadmap_generation', 'running', 60)
        plan_modules = module_plan.get("modules", [])
        if len(plan_modules) < 3:
            raise Exception("Generated module plan is too small to form a course.")
        log_step('roadmap_generation', 'completed', 60, cache=json.dumps({
            "daily_learning_time_minutes": daily_minutes,
            "practice_minutes": practice_minutes,
            "module_count": len(plan_modules),
        }))
        
        # Step 5: Parallel quizzes and coding challenge content generations
        log_step('parallel_generation', 'running', 70)
        
        quiz_enabled = "quiz" in includes
        coding_enabled = "coding" in includes
        revision_enabled = "revision" in includes
        final_enabled = "final_test" in includes

        async def timed_quiz_generation(module: Dict[str, Any]) -> List[Dict[str, Any]]:
            try:
                source_video_id = module.get("video_id") or playlist_videos[0]["video_id"]
                start_s = int(module.get("start_seconds") or 0)
                end_s = int(module.get("end_seconds") or 0)
                tx = get_transcript_for_timestamp_range(source_video_id, start_s, end_s)
                return await asyncio.wait_for(
                    generate_quiz_content(
                        module.get("title", "Lesson"),
                        module.get("description", ""),
                        advanced_options.get("difficulty", "medium"),
                        transcript=tx,
                    ),
                    timeout=75,
                )
            except Exception as e:
                print(f"Quiz generation timed out or failed for {module.get('title', 'Lesson')}: {e}")
                return fallback_quiz_questions(module.get("title", "Lesson"), module.get("focus_concepts", []))

        async def timed_challenge_generation(module: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            try:
                source_video_id = module.get("video_id") or playlist_videos[0]["video_id"]
                start_s = int(module.get("start_seconds") or 0)
                end_s = int(module.get("end_seconds") or 0)
                tx = get_transcript_for_timestamp_range(source_video_id, start_s, end_s)
                return await asyncio.wait_for(
                    generate_coding_challenge_content(
                        module.get("title", "Lesson"),
                        module.get("focus_concepts", []),
                        advanced_options.get("coding_difficulty", "medium"),
                        transcript=tx,
                    ),
                    timeout=75,
                )
            except Exception as e:
                print(f"Coding challenge generation timed out or failed for {module.get('title', 'Lesson')}: {e}")
                return fallback_coding_challenge(module.get("title", "Lesson"), module.get("focus_concepts", []))

        if quiz_enabled:
            quiz_futures = [timed_quiz_generation(m) for m in plan_modules]
            generated_quizzes_lists = await asyncio.gather(*quiz_futures)
            generated_quizzes_lists = [
                normalize_quiz_questions(questions, plan_modules[idx].get("title", "Lesson"), plan_modules[idx].get("focus_concepts", []))
                for idx, questions in enumerate(generated_quizzes_lists)
            ]
            log_step('parallel_generation', 'running', 80)
        else:
            generated_quizzes_lists = [[] for _ in plan_modules]
        
        if coding_enabled:
            challenge_futures = [timed_challenge_generation(m) for m in plan_modules]
            generated_challenges = await asyncio.gather(*challenge_futures)
            generated_challenges = [
                normalize_coding_challenge(challenge, plan_modules[idx].get("title", "Lesson"), plan_modules[idx].get("focus_concepts", []))
                for idx, challenge in enumerate(generated_challenges)
            ]
            log_step('parallel_generation', 'running', 88)
        else:
            generated_challenges = [None for _ in plan_modules]
        
        log_step('parallel_generation', 'completed', 90)
        
        # Step 6: Django Atomic Staged Transaction Commits
        log_step('save_database', 'running', 98)

        with transaction.atomic():
            course_obj = Course.objects.create(
                title=playlist_videos[0]["title"],
                description=module_plan.get("overview", "Personalized syllabus course timeline."),
                thumbnail=playlist_videos[0].get("thumbnail") or (build_youtube_thumbnail_url(video_id) if video_id else "https://picsum.photos/seed/playlist/200/120"),
                difficulty=advanced_options.get("difficulty", "medium"),
                category="coding",
                total_lessons=len(plan_modules),
                instructor_id=task.user_id,
                youtube_video_id=video_id,
                youtube_playlist_id=playlist_id,
                start_date=request["start_date"],
                daily_learning_time_minutes=daily_minutes,
                learning_goal=request.get("goals", ""),
                advanced_options_json=json.dumps(advanced_options),
                total_duration_seconds=course_duration,
                video_count=len(playlist_videos),
                language=advanced_options.get("language") or playlist_videos[0].get("language", "English"),
                channel_name=playlist_videos[0].get("channel_name", ""),
            )

            db_modules = []
            for idx, m in enumerate(plan_modules):
                source_video_id = m.get("video_id") or playlist_videos[min(idx, len(playlist_videos) - 1)]["video_id"]
                mod_obj = Module.objects.create(
                    course=course_obj,
                    title=m.get("title", f"Module {idx + 1}"),
                    description=m.get("description", ""),
                    video_url=f"https://www.youtube.com/watch?v={source_video_id}",
                    order=idx + 1,
                    estimated_minutes=int(m.get("estimated_minutes") or 60),
                    learning_day=int(m.get("learning_day") or idx + 1),
                    scheduled_date=parse_start_date(m.get("scheduled_date")),
                    scheduled_time=m.get("scheduled_time") or DEFAULT_SESSION_TIME,
                    watch_start_seconds=int(m.get("start_seconds") or 0),
                    watch_end_seconds=int(m.get("end_seconds") or 0),
                    source_video_id=source_video_id,
                )
                db_modules.append(mod_obj)

                timestamps = m.get("timestamps") if isinstance(m.get("timestamps"), list) else []
                if not timestamps:
                    timestamps = [
                        {"seconds": mod_obj.watch_start_seconds, "label": f"Start: {mod_obj.title}"},
                        {"seconds": mod_obj.watch_end_seconds, "label": f"Finish: {mod_obj.title}"},
                    ]
                for timestamp in timestamps:
                    VideoTimestamp.objects.create(
                        module=mod_obj,
                        timestamp_seconds=int(timestamp.get("seconds") or 0),
                        label=str(timestamp.get("label") or mod_obj.title)[:255],
                    )

                if quiz_enabled:
                    quiz_obj = Quiz.objects.create(
                        module=mod_obj,
                        title=f"{mod_obj.title} - Comprehension Check",
                        passing_score=70,
                    )
                    for q in generated_quizzes_lists[idx]:
                        QuizQuestion.objects.create(
                            quiz=quiz_obj,
                            question_text=q.get("question", "Self-check?"),
                            options_json=json.dumps(q.get("options", ["A", "B", "C", "D"])),
                            correct_option_index=q.get("correct_option_index", 0),
                        )

                challenge = generated_challenges[idx]
                if coding_enabled and challenge and challenge.get("title"):
                    CodingChallenge.objects.create(
                        module=mod_obj,
                        title=challenge.get("title"),
                        instructions=challenge.get("instructions"),
                        starter_code=challenge.get("starter_code"),
                        solution_code=challenge.get("solution_code"),
                        programming_language=challenge.get("programming_language", "python"),
                        test_cases_json=json.dumps(challenge.get("test_cases", [])),
                    )

                if revision_enabled and ((idx + 1) % 3 == 0 or idx == len(plan_modules) - 1):
                    RevisionSession.objects.create(
                        module=mod_obj,
                        scheduled_time=timezone.now() + timedelta(days=idx+1),
                        meeting_link=None,
                    )

                Note.objects.create(
                    student_id=task.user_id,
                    module=mod_obj,
                    timestamp_seconds=mod_obj.watch_start_seconds,
                    content=(
                        f"Study {mod_obj.title} from {format_timestamp(mod_obj.watch_start_seconds)} "
                        f"to {format_timestamp(mod_obj.watch_end_seconds)}. Key concepts: "
                        f"{', '.join(m.get('focus_concepts', [])[:5])}."
                    ),
                )

            if final_enabled and db_modules:
                FinalExam.objects.create(
                    module=db_modules[-1],
                    exam=None,
                    is_mandatory=True,
                )

            enrollment = CourseEnrollment.objects.create(
                course=course_obj,
                student_id=task.user_id,
                completed_lessons=0,
            )

            CourseProgress.objects.create(
                enrollment=enrollment,
                course=course_obj,
                progress_percentage=0,
                status="not_started",
            )

            # Create/Save the VideoTranscript records linked to course_obj inside the transaction
            for trans_data in transcripts_to_save:
                VideoTranscript.objects.create(
                    course=course_obj,
                    youtube_url=trans_data["youtube_url"],
                    youtube_video_id=trans_data["youtube_video_id"],
                    full_transcript=trans_data["full_transcript"],
                    processed_chunks_json=trans_data["processed_chunks_json"]
                )

            Notification.objects.create(
                user_id=task.user_id,
                title="Course Generated Successfully!",
                message=f"Your daily course plan for '{course_obj.title}' is ready.",
                type="course_success",
            )

        if not has_complete_generated_content(course_obj):
            raise Exception("Generated course failed integrity validation after SQLite save.")

        task.status = 'completed'
        task.progress = 100
        task.course_id = course_obj.id
        log_step('integrity_validation', 'completed', 100)
        task.current_step = 'Course created successfully!'
        task.save()
        
    except Exception as e:
        print(f"Course Generation Task failed: {e}")
        failed_step = next((k for k, v in steps.items() if v.status == 'running'), 'save_database')
        log_step(failed_step, 'failed', task.progress, error=str(e))
        
        try:
            Notification.objects.create(
                user_id=task.user_id,
                title="Course Generation Failed",
                message=f"We encountered an issue generating your course. Error: {str(e)[:100]}",
                type="course_failed"
            )
        except:
            pass

# ─── ASYNC THREAD POOL WORKER LOOP ────────────────────────────────────

def run_async_loop(coro):
    import os
    os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()

def generation_worker_loop():
    print("[Worker] Django Unified AI Course Generation Queue Worker Loop Active.")
    
    # Boot Rescue Loop
    try:
        interrupted_tasks = CourseGenerationTask.objects.filter(status='processing')
        for it in interrupted_tasks:
            print(f"[Warning] Rescuing interrupted course generation task: {it.id}")
            it.status = 'pending'
            it.current_step = 'Restored task queue after system restart...'
            it.save()
    except Exception as e:
        print(f"Failed to run boot rescue loop: {e}")
        
    while True:
        import sys
        if sys.is_finalizing() or not threading.main_thread().is_alive():
            break
        try:
            # Atomic SQLite Queue Claiming
            task = None
            with transaction.atomic():
                task = CourseGenerationTask.objects.filter(status='pending').order_by('created_at').first()
                if task:
                    task.status = 'processing'
                    task.current_step = 'Task claimed by active background worker process...'
                    task.updated_at = timezone.now()
                    task.save()
                    
            if task:
                print(f"[Database] Claimed task: {task.id} inside Django background worker.")
                # Run async generation pipeline in a dedicated subprocess context to preserve semaphore gating
                t = threading.Thread(target=run_async_loop, args=(process_generation_pipeline(task.id),))
                t.start()
                t.join() # Sequentially process courses
                
            import time
            time.sleep(3.0)
            
        except Exception as e:
            if sys.is_finalizing() or not threading.main_thread().is_alive():
                break
            print(f"Error in background task worker queue: {e}")
            import time
            time.sleep(5.0)

def start_background_worker():
    """Launches the background daemon thread executing AI generation tasks."""
    t = threading.Thread(target=generation_worker_loop, daemon=True, name="CourseGenWorker")
    t.start()
    print("[Worker] Started CourseGenWorker background daemon thread successfully.")
