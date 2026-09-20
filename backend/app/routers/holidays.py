import json
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException

from .. import schemas
from ..database import DB_DIR

router = APIRouter(prefix="/api/holidays", tags=["holidays"])

HOLIDAYS_DIR = DB_DIR / "holidays"
HOLIDAYS_DIR.mkdir(parents=True, exist_ok=True)

MIN_YEAR = 2007
MAX_YEAR = 2100

# holiday-cn（MIT）逐日抓取国务院公告，按年份提供 JSON。
# 依次尝试多个镜像，任一成功即可。
REMOTE_URLS = (
    "https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{year}.json",
    "https://fastly.jsdelivr.net/gh/NateScarlet/holiday-cn@master/{year}.json",
    "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json",
)


def _cache_path(year: int) -> Path:
    return HOLIDAYS_DIR / f"{year}.json"


def _normalize(payload: dict, year: int) -> dict:
    days = []
    for item in payload.get("days") or []:
        date = item.get("date")
        if not date:
            continue
        days.append(
            {
                "date": date,
                "name": item.get("name") or "",
                "is_off_day": bool(item.get("isOffDay")),
            }
        )
    return {"year": year, "days": days}


def _read_cache(year: int) -> dict | None:
    path = _cache_path(year)
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return _normalize(payload, year)


def _fetch_remote(year: int) -> dict | None:
    for template in REMOTE_URLS:
        url = template.format(year=year)
        try:
            response = httpx.get(url, timeout=8.0, follow_redirects=True)
        except httpx.HTTPError:
            continue
        if response.status_code != 200:
            continue
        try:
            payload = response.json()
        except ValueError:
            continue
        if not isinstance(payload, dict):
            continue
        return _normalize(payload, year)
    return None


@router.get("/{year}", response_model=schemas.HolidayCalendarOut)
def get_holidays(year: int):
    if year < MIN_YEAR or year > MAX_YEAR:
        raise HTTPException(status_code=400, detail="年份超出支持范围")

    cached = _read_cache(year)
    if cached is not None:
        return cached

    remote = _fetch_remote(year)
    if remote is None:
        raise HTTPException(status_code=502, detail="节假日数据获取失败")

    try:
        _cache_path(year).write_text(
            json.dumps(remote, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        pass
    return remote
