from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
import os, shutil, uuid
from sqlalchemy.orm import Session
from .db import SessionLocal, engine, Base
from .models.image import Image, ImageStatus

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

@app.post("/upload")
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # valida tipo básico
    if not file.filename.lower().endswith((".tif", ".tiff", ".jpg", ".jpeg", ".png")):
        raise HTTPException(status_code=400, detail="Formato de imagem não suportado")
    # gera filename único
    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, stored_name)
    # salva no disco
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)


    img = Image(
        filename=stored_name,
        original_name=file.filename,
        storage_url=path,
        status=ImageStatus.pending
    )
    db.add(img)
    db.commit()
    db.refresh(img)

    return JSONResponse({"id": img.id, "filename": img.filename, "status": img.status.value})
