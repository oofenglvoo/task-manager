def test_export_contains_data(client, project, statuses, make_task):
    tag = client.post("/api/tags", json={"name": "后端"}).json()
    task = make_task(
        project["id"],
        title="导出任务",
        priority=3,
        tag_ids=[tag["id"]],
        due_date="2026-10-01",
    )
    client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "子任务一"})

    data = client.get("/api/export").json()
    assert data["version"] == 1
    assert any(item["id"] == project["id"] for item in data["projects"])
    assert any(item["name"] == "待办" for item in data["statuses"])
    assert any(item["name"] == "后端" for item in data["tags"])

    exported = next(item for item in data["tasks"] if item["id"] == task["id"])
    assert exported["title"] == "导出任务"
    assert exported["priority"] == 3
    assert exported["tag_ids"] == [tag["id"]]
    assert [sub["title"] for sub in exported["subtasks"]] == ["子任务一"]


def test_import_replaces_all_data(client, project, statuses, make_task):
    tag = client.post("/api/tags", json={"name": "旧标签"}).json()
    make_task(project["id"], title="旧任务", tag_ids=[tag["id"]])
    backup = client.get("/api/export").json()

    client.post("/api/projects", json={"name": "临时项目"})
    make_task(project["id"], title="临时任务")
    assert len(client.get("/api/tasks").json()) == 2

    response = client.post("/api/import", json=backup)
    assert response.status_code == 200, response.text
    assert response.json()["tasks"] == 1

    tasks = client.get("/api/tasks").json()
    assert [item["title"] for item in tasks] == ["旧任务"]
    assert all(item["name"] != "临时项目" for item in client.get("/api/projects").json())


def test_import_preserves_tags_and_subtasks(client, project, statuses, make_task):
    tag = client.post("/api/tags", json={"name": "保留"}).json()
    task = make_task(project["id"], title="有子任务", tag_ids=[tag["id"]])
    client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "步骤一"})
    backup = client.get("/api/export").json()

    assert client.post("/api/import", json=backup).status_code == 200
    tasks = client.get("/api/tasks").json()
    assert len(tasks) == 1
    assert [item["name"] for item in tasks[0]["tags"]] == ["保留"]
    assert [sub["title"] for sub in tasks[0]["subtasks"]] == ["步骤一"]


def test_import_rejects_missing_project(client):
    payload = {
        "projects": [],
        "statuses": [],
        "tags": [],
        "tasks": [{"id": 1, "project_id": 999, "title": "坏任务"}],
    }
    assert client.post("/api/import", json=payload).status_code == 400
