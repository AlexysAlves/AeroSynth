from celery import Celery
import os

redis_url = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
celery = Celery("aerosynth", broker=redis_url, backend=redis_url)

# load tasks module
celery.autodiscover_tasks(['app.tasks'])
