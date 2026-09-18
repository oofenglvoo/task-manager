import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .. import schemas
from ..database import DB_DIR

router = APIRouter(prefix="/api/backgrounds", tags=["backgrounds"])

BACKGROUNDS_DIR = DB_DIR / "backgrounds"
BACKGROUNDS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}
MAX_BYTES = 8 * 1024 * 1024


@router.post("", response_model=schemas.BackgroundOut, status_code=201)
async def upload_background(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="仅支持图片文件")
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="文件为空")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="图片过大（上限 8MB）")
    name = f"{uuid.uuid4().hex}{suffix}"
    (BACKGROUNDS_DIR / name).write_bytes(data)
    return schemas.BackgroundOut(url=f"/api/backgrounds/{name}")


@router.get("/{filename}")
def get_background(filename: str):
    safe = Path(filename).name
    if safe != filename:
        raise HTTPException(status_code=404, detail="图片不存在")
    path = BACKGROUNDS_DIR / safe
    if not path.is_file():
        raise HTTPException(status_code=404, detail="图片不存在")
    return FileResponse(path)


@router.delete("/{filename}", status_code=204)
def delete_background(filename: str):
    safe = Path(filename).name
    if safe != filename:
        raise HTTPException(status_code=404, detail="图片不存在")
    path = BACKGROUNDS_DIR / safe
    if path.is_file():
        path.unlink()
