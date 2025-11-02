from .celery_app import celery
from .db import SessionLocal
from .models.image import Image, ImageStatus
import os, subprocess, json, traceback, uuid
import requests

THUMB_DIR = os.getenv("UPLOAD_DIR", "/data/uploads").rstrip("/") + "/thumbnails"
os.makedirs(THUMB_DIR, exist_ok=True)

MAX_SIDE = 1024

def run_cmd(cmd):
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return proc.returncode, proc.stdout, proc.stderr

@celery.task(bind=True, acks_late=True)
def process_image(self, image_id: int):
    db = SessionLocal()
    img = None
    try:
        img = db.query(Image).get(image_id)
        if not img:
            return {"error": "image not found"}

        img.status = ImageStatus.processing
        db.commit()

        path = img.storage_url
        if not path or not os.path.exists(path):
            img.status = ImageStatus.error
            db.commit()
            return {"error": "file not found"}

        rc, out, err = run_cmd(["gdalinfo", "-json", path])
        if rc != 0:
            meta = img.meta or {}
            meta["gdalinfo_error"] = err.strip()
            img.meta = meta
            db.commit()
          
        else:
            info = json.loads(out)
            width, height = info.get("size", [None, None])
            if width is None:
                bands = info.get("bands", [])
                width = info.get("width") or None
                height = info.get("height") or None

            bounds = None
            if "cornerCoordinates" in info:
                pass
           
            if "cornerCoordinates" in info:
                cc = info["cornerCoordinates"]
            if "cornerCoordinates" in info and isinstance(info["cornerCoordinates"], dict):
                try:
                    coords = info["cornerCoordinates"]
                    xs = [coords[k][0] for k in coords if isinstance(coords[k], list)]
                    ys = [coords[k][1] for k in coords if isinstance(coords[k], list)]
                    left = min(xs); right = max(xs)
                    bottom = min(ys); top = max(ys)
                    bounds = {"left": left, "bottom": bottom, "right": right, "top": top}
                except Exception:
                    bounds = None

        try:
            if width and height:
                if width >= height:
                    target_w = MAX_SIDE
                    target_h = int(round((MAX_SIDE * height) / width))
                else:
                    target_h = MAX_SIDE
                    target_w = int(round((MAX_SIDE * width) / height))
            else:
                target_w = MAX_SIDE
                target_h = MAX_SIDE
        except Exception:
            target_w = MAX_SIDE
            target_h = MAX_SIDE

        thumb_name = f"{uuid.uuid4().hex}.png"
        thumb_path = os.path.join(THUMB_DIR, thumb_name)

        cmd = ["gdal_translate", "-of", "PNG", "-outsize", str(target_w), str(target_h), path, thumb_path]
        rc, out, err = run_cmd(cmd)
        if rc != 0:
            meta = img.meta or {}
            meta["thumbnail_error"] = err.strip()
            img.meta = meta
            img.status = ImageStatus.error
            db.commit()
            return {"error": "gdal_translate failed", "stderr": err}

        meta = img.meta or {}
        meta["thumbnail_url"] = f"/uploads/thumbnails/{thumb_name}"
        if bounds:
            meta["bounds"] = bounds
        img.meta = meta
        img.status = ImageStatus.done
        db.commit()
        try:
            backend_notify_url = os.getenv("BACKEND_INTERNAL_URL", "http://backend:8000/notify")
            payload = {
                "id": img.id,
                "status": img.status.value,
                "meta": img.meta or {}
            }
            requests.post(backend_notify_url, json=payload, timeout=5)
        except Exception as e:
            print("notify failed:", e)
        return {"status": "done", "thumbnail": meta["thumbnail_url"]}

    except Exception as e:
        traceback.print_exc()
        if img:
            try:
                img.status = ImageStatus.error
                db.commit()
            except Exception:
                pass
        raise e
    finally:
        db.close()
