from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
import os, shutil, uuid
from sqlalchemy.orm import Session
from .db import SessionLocal, engine, Base
from .models.image import Image, ImageStatus
from .tasks import process_image
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

Base.metadata.create_all(bind=engine)  

app = FastAPI(title="AeroSynth API")


origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"message": "AeroSynth API funcionando 🚀"}

@app.post("/upload")
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith((".tif", ".tiff", ".jpg", ".jpeg", ".png")):
        raise HTTPException(status_code=400, detail="Formato de imagem não suportado")
    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, stored_name)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    img = Image(filename=stored_name, original_name=file.filename, storage_url=path, status=ImageStatus.pending)
    db.add(img)
    db.commit()
    db.refresh(img)
    process_image.delay(img.id)
    return JSONResponse({"id": img.id, "filename": img.filename, "status": img.status.value})

@app.get("/images")
def list_images(db: Session = Depends(get_db)):
    images = db.query(Image).all()
    out = []
    for img in images:
        meta = img.meta or {}
        thumb = meta.get("thumbnail_url")
        out.append({
            "id": img.id,
            "original_name": img.original_name,
            "filename": img.filename,
            "status": img.status.value,
            "uploaded_at": img.uploaded_at.isoformat() if img.uploaded_at else None,
            "thumbnail_url": thumb
        })
    return out

@app.get("/images/{image_id}")
def get_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).get(image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    meta = img.meta or {}
    return {
        "id": img.id,
        "filename": img.filename,
        "original_name": img.original_name,
        "status": img.status.value,
        "storage_url": img.storage_url,
        "meta": meta,
        "thumbnail_url": meta.get("thumbnail_url")
    }

@app.get("/images/{image_id}/download")
def download_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).get(image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    return FileResponse(img.storage_url, filename=img.original_name)