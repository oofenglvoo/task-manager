def test_create_records_initial_history(client, make_task):
    task = make_task(title="初始标题", description="<p>初始描述</p>")
    history = client.get(f"/api/tasks/{task['id']}/history").json()
    assert len(history) == 1
    snapshot = history[0]["snapshot"]
    assert snapshot["title"] == "初始标题"
    assert snapshot["description"] == "<p>初始描述</p>"


def test_update_appends_history_only_on_change(client, make_task):
    task = make_task(title="任务")
    assert len(client.get(f"/api/tasks/{task['id']}/history").json()) == 1

    client.put(f"/api/tasks/{task['id']}", json={"title": "任务"})
    assert len(client.get(f"/api/tasks/{task['id']}/history").json()) == 1

    client.put(f"/api/tasks/{task['id']}", json={"title": "改过的标题"})
    history = client.get(f"/api/tasks/{task['id']}/history").json()
    assert len(history) == 2
    assert history[0]["snapshot"]["title"] == "改过的标题"


def test_history_snapshot_uses_names(client, statuses, make_group):
    group = make_group("工作")
    tag = client.post("/api/tags", json={"name": "紧急"}).json()
    task = client.post(
        "/api/tasks",
        json={
            "title": "任务",
            "status_id": statuses[0]["id"],
            "group_id": group["id"],
            "tag_ids": [tag["id"]],
        },
    ).json()
    snapshot = client.get(f"/api/tasks/{task['id']}/history").json()[0]["snapshot"]
    assert snapshot["status_name"] == statuses[0]["name"]
    assert snapshot["group_name"] == "工作"
    assert snapshot["tag_names"] == ["紧急"]


def test_history_strips_images(client, make_task):
    task = make_task(
        title="带图",
        description='<p>文字</p><img src="data:image/png;base64,AAAA">',
    )
    snapshot = client.get(f"/api/tasks/{task['id']}/history").json()[0]["snapshot"]
    assert "img" not in snapshot["description"]
    assert "文字" in snapshot["description"]


def test_history_ordered_newest_first(client, make_task):
    task = make_task(title="v1")
    client.put(f"/api/tasks/{task['id']}", json={"title": "v2"})
    client.put(f"/api/tasks/{task['id']}", json={"title": "v3"})
    history = client.get(f"/api/tasks/{task['id']}/history").json()
    assert [item["snapshot"]["title"] for item in history] == ["v3", "v2", "v1"]


def test_delete_history_entry(client, make_task):
    task = make_task(title="v1")
    client.put(f"/api/tasks/{task['id']}", json={"title": "v2"})
    history = client.get(f"/api/tasks/{task['id']}/history").json()
    target = history[-1]["id"]

    assert client.delete(f"/api/tasks/{task['id']}/history/{target}").status_code == 204
    remaining = client.get(f"/api/tasks/{task['id']}/history").json()
    assert len(remaining) == 1
    assert remaining[0]["snapshot"]["title"] == "v2"


def test_delete_history_wrong_task_returns_404(client, make_task):
    first = make_task(title="A")
    second = make_task(title="B")
    history = client.get(f"/api/tasks/{first['id']}/history").json()
    response = client.delete(f"/api/tasks/{second['id']}/history/{history[0]['id']}")
    assert response.status_code == 404


def test_history_cascades_on_task_delete(client, make_task):
    task = make_task(title="任务")
    assert client.get(f"/api/tasks/{task['id']}/history").json()
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}/history").status_code == 404


def test_export_import_includes_history(client, make_task):
    task = make_task(title="v1", description="<p>一</p>")
    client.put(f"/api/tasks/{task['id']}", json={"title": "v2"})
    backup = client.get("/api/export").json()
    exported = next(item for item in backup["tasks"] if item["id"] == task["id"])
    assert [entry["snapshot"]["title"] for entry in exported["history"]] == ["v1", "v2"]

    assert client.post("/api/import", json=backup).status_code == 200
    imported = client.get("/api/tasks").json()[0]
    history = client.get(f"/api/tasks/{imported['id']}/history").json()
    assert [entry["snapshot"]["title"] for entry in history] == ["v2", "v1"]


def test_legacy_export_without_history_imports(client):
    payload = {
        "version": 1,
        "statuses": [],
        "tags": [],
        "groups": [],
        "tasks": [{"id": 1, "title": "旧任务"}],
    }
    assert client.post("/api/import", json=payload).status_code == 200
    tasks = client.get("/api/tasks").json()
    assert [item["title"] for item in tasks] == ["旧任务"]
