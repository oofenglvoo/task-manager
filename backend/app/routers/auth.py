from fastapi import APIRouter, Cookie, HTTPException, Response, status
from pydantic import BaseModel, Field

from .. import auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginPayload(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class SessionOut(BaseModel):
    authenticated: bool
    username: str | None = None


@router.post("/login", response_model=SessionOut)
def login(payload: LoginPayload, response: Response):
    if not auth.check_credentials(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误"
        )
    username = auth.get_username() or payload.username
    auth.set_session_cookie(response, username)
    return SessionOut(authenticated=True, username=username)


@router.post("/logout", response_model=SessionOut)
def logout(response: Response):
    auth.clear_session_cookie(response)
    return SessionOut(authenticated=False, username=None)


@router.get("/session", response_model=SessionOut)
def session(session: str | None = Cookie(default=None, alias=auth.COOKIE_NAME)):
    username = auth.verify_token(session)
    if username is None:
        return SessionOut(authenticated=False, username=None)
    return SessionOut(authenticated=True, username=username)
