from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
import os, shutil, uuid
from sqlalchemy.orm import Session
from .db import SessionLocal, engine, Base
from .models.image import Image, ImageStatus
from .tasks import process_image

Base.metadata.create_all(bind=engine)  # cria tabelas

app = FastAPI(title="AeroSynth API")

# Dependency
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
def list_images(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    rows = db.query(Image).order_by(Image.uploaded_at.desc()).offset(offset).limit(limit).all()
    return [{"id": r.id, "filename": r.filename, "original_name": r.original_name, "status": r.status.value, "uploaded_at": r.uploaded_at.isoformat()} for r in rows]

@app.get("/images/{image_id}")
def get_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).get(image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    return {"id": img.id, "filename": img.filename, "original_name": img.original_name, "status": img.status.value, "storage_url": img.storage_url}

# endpoint para baixar o arquivo (opcional)
@app.get("/images/{image_id}/download")
def download_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).get(image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    return FileResponse(img.storage_url, filename=img.original_name)