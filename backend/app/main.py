from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, SessionLocal, engine, ensure_schema
from .routers import (
    backgrounds,
    data,
    groups,
    settings,
    stats,
    statuses,
    subtasks,
    tags,
    tasks,
)
from .seed import seed_defaults

Base.metadata.create_all(bind=engine)
ensure_schema()

with SessionLocal() as _session:
    seed_defaults(_session)

app = FastAPI(title="Task Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(statuses.router)
app.include_router(tags.router)
app.include_router(groups.router)
app.include_router(tasks.router)
app.include_router(subtasks.router)
app.include_router(stats.router)
app.include_router(settings.router)
app.include_router(backgrounds.router)
app.include_router(data.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"

if DIST_DIR.is_dir():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        candidate = DIST_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST_DIR / "index.html")
