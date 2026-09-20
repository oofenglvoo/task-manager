"""单账号用户名 + 密码鉴权。

设计要点：
- 配置全部来自环境变量，缺少必需项时启动即报错退出（见 `require_config`）。
- 令牌用标准库自签（base64url(payload).base64url(hmac_sha256)），不引入额外依赖。
- 登录成功后通过 HttpOnly Cookie 下发令牌；部署场景是 http + IP 直连，因此不设 Secure。
- 只保护 /api/*，前端页面与静态资源保持公开，否则刷新页面会拿不到登录页。
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Cookie, HTTPException, Response, status

COOKIE_NAME = "task_manager_session"
DEFAULT_TOKEN_DAYS = 30


def _env(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def get_username() -> str | None:
    return _env("TASK_APP_USERNAME")


def get_password() -> str | None:
    return _env("TASK_APP_PASSWORD")


def get_secret_key() -> str | None:
    return _env("TASK_SECRET_KEY")


def get_token_days() -> int:
    raw = _env("TASK_TOKEN_DAYS")
    if raw is None:
        return DEFAULT_TOKEN_DAYS
    try:
        days = int(raw)
    except ValueError:
        return DEFAULT_TOKEN_DAYS
    return days if days > 0 else DEFAULT_TOKEN_DAYS


def missing_config() -> list[str]:
    """返回缺失的必需环境变量名，供启动时校验。"""
    required = ["TASK_APP_USERNAME", "TASK_APP_PASSWORD", "TASK_SECRET_KEY"]
    return [name for name in required if _env(name) is None]


def require_config() -> None:
    """启动校验：缺少账号配置时直接退出，避免以“无鉴权”状态对外提供服务。"""
    missing = missing_config()
    if missing:
        raise SystemExit(
            "[auth] 缺少必需的环境变量："
            + "、".join(missing)
            + "\n[auth] 请复制 server.env.example 为 server.env 并填写后再启动。"
        )


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign(payload: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).digest()
    return _b64encode(digest)


def create_token(username: str) -> str:
    secret = get_secret_key() or ""
    payload = {
        "sub": username,
        "exp": int(time.time()) + get_token_days() * 86400,
        "nonce": secrets.token_hex(8),
    }
    encoded = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{encoded}.{_sign(encoded.encode('ascii'), secret)}"


def verify_token(token: str | None) -> str | None:
    """校验令牌，合法则返回用户名，否则返回 None。"""
    if not token:
        return None
    secret = get_secret_key()
    if not secret:
        return None
    try:
        encoded, signature = token.split(".", 1)
    except ValueError:
        return None
    if not secrets.compare_digest(_sign(encoded.encode("ascii"), secret), signature):
        return None
    try:
        payload = json.loads(_b64decode(encoded))
    except (ValueError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    if payload.get("sub") != get_username():
        return None
    expires = payload.get("exp")
    if not isinstance(expires, int) or expires < int(time.time()):
        return None
    return str(payload.get("sub"))


def check_credentials(username: str, password: str) -> bool:
    expected_user = get_username()
    expected_pass = get_password()
    if expected_user is None or expected_pass is None:
        return False
    user_ok = secrets.compare_digest(username, expected_user)
    pass_ok = secrets.compare_digest(password, expected_pass)
    return user_ok and pass_ok


def require_auth(session: str | None = Cookie(default=None, alias=COOKIE_NAME)) -> str:
    """业务路由依赖：未登录直接 401，前端据此切回登录页。"""
    username = verify_token(session)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录"
        )
    return username


def set_session_cookie(response: Response, username: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_token(username),
        max_age=get_token_days() * 86400,
        httponly=True,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/", samesite="lax")
