from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])

VALID_THEMES = {"dark", "light", "system"}
VALID_SIZES = {"sm", "md", "lg"}


def get_or_create(db: Session) -> models.Preference:
    preference = db.get(models.Preference, 1)
    if preference is None:
        preference = models.Preference(
            id=1,
            theme="system",
            card_size="md",
            compact=False,
            group_by=False,
            background_url=None,
            bg_opacity=0.7,
            card_opacity=1.0,
            panel_opacity=0.82,
        )
        db.add(preference)
        db.commit()
        db.refresh(preference)
    return preference


@router.get("", response_model=schemas.PreferenceOut)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create(db)


@router.put("", response_model=schemas.PreferenceOut)
def update_settings(payload: schemas.PreferenceUpdate, db: Session = Depends(get_db)):
    preference = get_or_create(db)
    data = payload.model_dump(exclude_unset=True)
    if "theme" in data and data["theme"] not in VALID_THEMES:
        raise HTTPException(status_code=400, detail="不支持的主题")
    if "card_size" in data and data["card_size"] not in VALID_SIZES:
        raise HTTPException(status_code=400, detail="不支持的卡片大小")
    for key, value in data.items():
        setattr(preference, key, value)
    db.commit()
    db.refresh(preference)
    return preference
