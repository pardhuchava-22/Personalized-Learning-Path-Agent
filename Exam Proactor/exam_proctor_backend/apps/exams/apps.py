from django.apps import AppConfig


class ExamsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'exam_proctor_backend.apps.exams'

    def ready(self):
        import sys
        # Only start background worker daemon thread when runserver is called to avoid running on migrate/collectstatic commands
        if 'runserver' in sys.argv:
            from .services import start_background_worker
            start_background_worker()
