from .celery_app import celery
from .db import SessionLocal
from .models.image import Image, ImageStatus
import os
import traceback

try:
    import rasterio
    HAS_RASTERIO = True
except Exception:
    HAS_RASTERIO = False

@celery.task(bind=True, acks_late=True)
def process_image(self, image_id: int):
    db = SessionLocal()
    try:
        img = db.query(Image).get(image_id)
        if not img:
            return {"error": "image not found"}

        img.status = ImageStatus.processing
        db.commit()

        path = img.storage_url
        result = {"image_id": image_id}

        if HAS_RASTERIO and path and os.path.exists(path):
            try:
                with rasterio.open(path) as src:
                    result["width"] = int(src.width)
                    result["height"] = int(src.height)
                    result["crs"] = str(src.crs) if src.crs else None
                    bounds = src.bounds
                    result["bounds"] = {"left": bounds.left, "bottom": bounds.bottom, "right": bounds.right, "top": bounds.top}
            except Exception as e:
                result["rasterio_error"] = str(e)
        else:
            result["note"] = "rasterio não disponível ou arquivo não encontrado — processamento simulado"

        img.meta = result
        img.status = ImageStatus.done
        db.commit()
        return {"status": "done", "result": result}

    except Exception as e:
        try:
            img.status = ImageStatus.error
            db.commit()
        except Exception:
            pass
        traceback.print_exc()
        raise e
    finally:
        db.close()
