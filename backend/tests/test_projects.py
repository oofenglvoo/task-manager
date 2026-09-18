def test_seed_creates_default_project_and_statuses(client):
    projects = client.get("/api/projects").json()
    assert [item["name"] for item in projects] == ["默认项目"]

    statuses = client.get("/api/statuses").json()
    assert [item["name"] for item in statuses] == ["待办", "进行中", "已完成"]
    assert [item["is_done"] for item in statuses] == [False, False, True]


def test_create_update_and_get_project(client):
    created = client.post(
        "/api/projects",
        json={"name": "  工作  ", "description": "工作相关", "color": "#ff0000"},
    )
    assert created.status_code == 201
    project = created.json()
    assert project["name"] == "工作"
    assert project["position"] > 1

    updated = client.put(
        f"/api/projects/{project['id']}", json={"name": "工作台"}
    ).json()
    assert updated["name"] == "工作台"

    fetched = client.get(f"/api/projects/{project['id']}").json()
    assert fetched["name"] == "工作台"


def test_project_task_count_excludes_archived(client, project, make_task):
    first = make_task(project["id"], title="A")
    make_task(project["id"], title="B")
    client.post(f"/api/tasks/{first['id']}/archive", json={"is_archived": True})

    fetched = client.get(f"/api/projects/{project['id']}").json()
    assert fetched["task_count"] == 1


def test_archive_and_unarchive_project(client, project):
    archived = client.post(
        f"/api/projects/{project['id']}/archive", json={"is_archived": True}
    ).json()
    assert archived["is_archived"] is True
    assert project["id"] not in [item["id"] for item in client.get("/api/projects").json()]
    assert project["id"] in [
        item["id"] for item in client.get("/api/projects?archived=true").json()
    ]


def test_reorder_projects(client, project):
    second = client.post("/api/projects", json={"name": "第二个"}).json()
    current = [item["id"] for item in client.get("/api/projects").json()]
    new_order = [second["id"]] + [item for item in current if item != second["id"]]

    response = client.put("/api/projects/reorder", json={"ordered_ids": new_order})
    assert response.status_code == 204
    assert [item["id"] for item in client.get("/api/projects").json()] == new_order


def test_delete_project_cascades_tasks(client, project, make_task):
    task = make_task(project["id"])
    assert client.delete(f"/api/projects/{project['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").status_code == 404


def test_get_missing_project_returns_404(client):
    assert client.get("/api/projects/99999").status_code == 404
