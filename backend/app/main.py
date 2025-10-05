from fastapi import FastAPI

app = FastAPI(title="Plataforma de Imagens Aéreas")

@app.get("/")
def root():
    return {"message": "API funcionando 🚀"}