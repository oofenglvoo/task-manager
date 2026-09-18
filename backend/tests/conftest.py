import os
import tempfile
from pathlib import Path

_TMP_DIR = tempfile.mkdtemp(prefix="task-manager-tests-")
os.environ["TASK_DB_PATH"] = str(Path(_TMP_DIR) / "test.db")

import pytest
from fastapi.testclient import TestClient

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
def client():
    with TestClient(app) as test_client:
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
