def test_create_and_list_groups(client):
    client.post("/api/groups", json={"name": "工作", "color": "#6366f1"})
    client.post("/api/groups", json={"name": "个人"})
    groups = client.get("/api/groups").json()
    assert [item["name"] for item in groups] == ["工作", "个人"]
    assert all(item["position"] > 0 for item in groups)
    assert all(item["task_count"] == 0 for item in groups)


def test_create_duplicate_group_conflicts(client):
    client.post("/api/groups", json={"name": "工作"})
    assert client.post("/api/groups", json={"name": "工作"}).status_code == 409


def test_create_group_with_blank_name_fails(client):
    assert client.post("/api/groups", json={"name": "   "}).status_code == 400


def test_update_group(client):
    group = client.post("/api/groups", json={"name": "工作"}).json()
    updated = client.put(
        f"/api/groups/{group['id']}", json={"name": "工作台", "color": "#22c55e"}
    ).json()
    assert updated["name"] == "工作台"
    assert updated["color"] == "#22c55e"


def test_group_task_count(client, make_group):
    group = make_group()
    client.post("/api/tasks", json={"title": "A", "group_id": group["id"]})
    client.post("/api/tasks", json={"title": "B", "group_id": group["id"]})
    fetched = next(item for item in client.get("/api/groups").json() if item["id"] == group["id"])
    assert fetched["task_count"] == 2


def test_delete_group_keeps_tasks_ungrouped(client, make_group):
    group = make_group()
    task = client.post(
        "/api/tasks", json={"title": "任务", "group_id": group["id"]}
    ).json()
    assert task["group_id"] == group["id"]

    assert client.delete(f"/api/groups/{group['id']}").status_code == 204
    fetched = client.get(f"/api/tasks/{task['id']}").json()
    assert fetched["group_id"] is None
    assert fetched["group"] is None


def test_reorder_groups(client, make_group):
    first = make_group("A")
    second = make_group("B")
    response = client.put(
        "/api/groups/reorder", json={"ordered_ids": [second["id"], first["id"]]}
    )
    assert response.status_code == 204
    groups = client.get("/api/groups").json()
    assert [item["id"] for item in groups] == [second["id"], first["id"]]


def test_group_note_roundtrip(client):
    created = client.post(
        "/api/groups", json={"name": "工作", "note": "本周目标"}
    ).json()
    assert created["note"] == "本周目标"

    updated = client.put(
        f"/api/groups/{created['id']}", json={"note": "改为下周"}
    ).json()
    assert updated["note"] == "改为下周"

    cleared = client.put(f"/api/groups/{created['id']}", json={"note": "   "}).json()
    assert cleared["note"] is None


def test_group_without_note_defaults_to_none(client):
    group = client.post("/api/groups", json={"name": "无备注"}).json()
    assert group["note"] is None


def test_get_missing_group_returns_404(client):
    assert client.put("/api/groups/99999", json={"name": "x"}).status_code == 404
    assert client.delete("/api/groups/99999").status_code == 404


def test_create_task_with_unknown_group_fails(client):
    response = client.post("/api/tasks", json={"title": "任务", "group_id": 999})
    assert response.status_code == 404


def test_update_task_group(client, make_group):
    group = make_group()
    task = client.post("/api/tasks", json={"title": "任务"}).json()
    assert task["group_id"] is None

    assigned = client.put(
        f"/api/tasks/{task['id']}", json={"group_id": group["id"]}
    ).json()
    assert assigned["group_id"] == group["id"]
    assert assigned["group"]["name"] == group["name"]

    cleared = client.put(f"/api/tasks/{task['id']}", json={"group_id": None}).json()
    assert cleared["group_id"] is None
    assert cleared["group"] is None


def test_update_task_with_unknown_group_fails(client, make_task):
    task = make_task()
    response = client.put(f"/api/tasks/{task['id']}", json={"group_id": 999})
    assert response.status_code == 404


def test_filter_tasks_by_group(client, make_group):
    group = make_group()
    grouped = client.post(
        "/api/tasks", json={"title": "在组", "group_id": group["id"]}
    ).json()
    client.post("/api/tasks", json={"title": "无组"})

    in_group = client.get(f"/api/tasks?group_id={group['id']}").json()
    assert [item["id"] for item in in_group] == [grouped["id"]]

    ungrouped = client.get("/api/tasks?ungrouped=true").json()
    assert [item["title"] for item in ungrouped] == ["无组"]


def test_move_task_to_group(client, make_group, make_task):
    group = make_group()
    task = make_task()
    moved = client.put(
        f"/api/tasks/{task['id']}/move", json={"group_id": group["id"]}
    ).json()
    assert moved["group_id"] == group["id"]


def test_move_task_clears_group(client, make_group, make_task):
    group = make_group()
    task = make_task(group_id=group["id"])
    moved = client.put(
        f"/api/tasks/{task['id']}/move", json={"group_id": None}
    ).json()
    assert moved["group_id"] is None


def test_move_task_updates_position(client, make_group, make_task):
    group = make_group()
    first = make_task(title="A")
    second = make_task(title="B")
    moved = client.put(
        f"/api/tasks/{second['id']}/move",
        json={"group_id": group["id"], "position": 1},
    ).json()
    assert moved["group_id"] == group["id"]
    assert moved["position"] == 1
    assert first["id"] != moved["id"]
