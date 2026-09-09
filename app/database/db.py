from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config.settings import settings

# SQLite connection configuration with thread compatibility
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SQLITE_COMPAT_COLUMNS = {
    "courses": [
        ("start_date", "DATE"),
        ("daily_learning_time_minutes", "INTEGER DEFAULT 120"),
        ("learning_goal", "TEXT DEFAULT ''"),
        ("advanced_options_json", "TEXT DEFAULT '{}'"),
        ("total_duration_seconds", "INTEGER DEFAULT 0"),
        ("video_count", "INTEGER DEFAULT 1"),
        ("language", "VARCHAR(50) DEFAULT 'English'"),
        ("channel_name", "VARCHAR(255) DEFAULT ''"),
    ],
    "modules": [
        ("estimated_minutes", "INTEGER DEFAULT 60"),
        ("learning_day", "INTEGER DEFAULT 1"),
        ("scheduled_date", "DATE"),
        ("scheduled_time", "VARCHAR(20)"),
        ("watch_start_seconds", "INTEGER DEFAULT 0"),
        ("watch_end_seconds", "INTEGER DEFAULT 0"),
        ("source_video_id", "VARCHAR(50)"),
    ],
    "course_generation_tasks": [
        ("request_payload_json", "TEXT DEFAULT '{}'"),
        ("daily_learning_time_minutes", "INTEGER DEFAULT 120"),
        ("start_date", "DATE"),
        ("goals", "TEXT DEFAULT ''"),
        ("advanced_options_json", "TEXT DEFAULT '{}'"),
    ],
    "coding_challenges": [
        ("test_cases_json", "TEXT NOT NULL DEFAULT '[]'"),
    ],
}


def _ensure_sqlite_columns(dbapi_connection, _connection_record):
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    cursor = dbapi_connection.cursor()
    try:
        for table, columns in SQLITE_COMPAT_COLUMNS.items():
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table,),
            )
            if not cursor.fetchone():
                continue

            cursor.execute(f"PRAGMA table_info({table})")
            existing = {row[1] for row in cursor.fetchall()}

            for name, ddl in columns:
                if name not in existing:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")

        dbapi_connection.commit()
    finally:
        cursor.close()


event.listen(engine, "connect", _ensure_sqlite_columns)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# DB Dependency injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
