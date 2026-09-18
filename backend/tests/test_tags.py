def test_create_and_list_tags(client):
    client.post("/api/tags", json={"name": "后端", "color": "#38bdf8"})
    client.post("/api/tags", json={"name": "前端"})
    names = [item["name"] for item in client.get("/api/tags").json()]
    assert names == ["前端", "后端"]


def test_create_duplicate_tag_conflicts(client):
    client.post("/api/tags", json={"name": "后端"})
    assert client.post("/api/tags", json={"name": "后端"}).status_code == 409


def test_update_tag(client):
    tag = client.post("/api/tags", json={"name": "后端"}).json()
    updated = client.put(
        f"/api/tags/{tag['id']}", json={"name": "服务端", "color": "#22c55e"}
    ).json()
    assert updated["name"] == "服务端"
    assert updated["color"] == "#22c55e"


def test_delete_tag_removes_it_from_tasks(client, project, make_task):
    tag = client.post("/api/tags", json={"name": "临时"}).json()
    task = make_task(project["id"], tag_ids=[tag["id"]])
    assert len(task["tags"]) == 1

    assert client.delete(f"/api/tags/{tag['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").json()["tags"] == []


def test_create_task_with_unknown_tag_fails(client, project):
    response = client.post(
        "/api/tasks", json={"title": "任务", "project_id": project["id"], "tag_ids": [999]}
    )
    assert response.status_code == 400
