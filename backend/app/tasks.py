from .celery_app import celery
from .db import SessionLocal
from .models.image import Image, ImageStatus

@celery.task(bind=True)
def process_image(self, image_id: int):
    db = SessionLocal()
    try:
        img = db.query(Image).get(image_id)
        if not img:
            return {"error": "image not found"}
        img.status = ImageStatus.processing
        db.commit()
        img.status = ImageStatus.done
        db.commit()
        return {"status": "done"}
    except Exception as e:
        img.status = ImageStatus.error
        db.commit()
        raise
    finally:
        db.close()
