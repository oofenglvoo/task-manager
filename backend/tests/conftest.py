import os
import tempfile
from pathlib import Path

_TMP_DIR = tempfile.mkdtemp(prefix="task-manager-tests-")
os.environ["TASK_DB_PATH"] = str(Path(_TMP_DIR) / "test.db")
# 鉴权配置是 import 时强校验的，测试环境用固定值。
os.environ.setdefault("TASK_APP_USERNAME", "tester")
os.environ.setdefault("TASK_APP_PASSWORD", "tester-password")
os.environ.setdefault("TASK_SECRET_KEY", "test-secret-key")

import pytest
from fastapi.testclient import TestClient

from app import auth
from app.database import Base, SessionLocal, engine
from app.main import app
from app.seed import seed_defaults


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_defaults(session)
    yield


@pytest.fixture
def anonymous_client():
    """未登录客户端，用于验证 401 行为。"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client():
    """已登录客户端；`/api/*` 全部受保护，业务测试都需要它。"""
    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/auth/login",
            json={
                "username": auth.get_username(),
                "password": auth.get_password(),
            },
        )
        assert response.status_code == 200, response.text
        yield test_client


@pytest.fixture
def statuses(client):
    response = client.get("/api/statuses")
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def make_group(client):
    def _make(name: str = "测试分组", **kwargs):
        payload = {"name": name}
        payload.update(kwargs)
        response = client.post("/api/groups", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make


@pytest.fixture
def make_task(client):
    def _make(**kwargs):
        payload = {"title": "任务"}
        payload.update(kwargs)
        response = client.post("/api/tasks", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make
