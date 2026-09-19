def test_create_task_uses_defaults(client, statuses, make_task):
    task = make_task()
    assert task["title"] == "任务"
    # 默认使用第一条优先级（低，level 1）。
    assert task["priority"] == 1
    assert task["status_id"] == statuses[0]["id"]
    assert task["completed_at"] is None
    assert task["due_date"] is None
    assert task["tags"] == []
    assert task["subtasks"] == []
    assert task["created_at"] is not None
    assert task["updated_at"] is not None


def test_create_task_with_all_fields(client, make_task):
    tag = client.post("/api/tags", json={"name": "紧急"}).json()
    task = make_task(
        title="  发布版本  ",
        tag_ids=[tag["id"]],
        due_date="2026-10-01",
        priority=3,
        description="打 tag 并推送",
    )
    assert task["title"] == "发布版本"
    assert task["priority"] == 3
    assert task["due_date"] == "2026-10-01"
    assert [item["name"] for item in task["tags"]] == ["紧急"]


def test_unknown_priority_is_rejected(client):
    # 优先级已成为数据表，引用不存在的 id 返回 404。
    response = client.post("/api/tasks", json={"title": "任务", "priority": 999})
    assert response.status_code == 404


def test_marking_done_sets_completed_at_and_back_clears_it(client, statuses, make_task):
    todo = statuses[0]
    done = next(item for item in statuses if item["is_done"])
    task = make_task(status_id=todo["id"])

    completed = client.put(f"/api/tasks/{task['id']}", json={"status_id": done["id"]}).json()
    assert completed["completed_at"] is not None

    reopened = client.put(f"/api/tasks/{task['id']}", json={"status_id": todo["id"]}).json()
    assert reopened["completed_at"] is None


def test_create_task_already_in_done_status_sets_completed_at(client, statuses, make_task):
    done = next(item for item in statuses if item["is_done"])
    task = make_task(status_id=done["id"])
    assert task["completed_at"] is not None


def test_update_task_fields_and_tags(client, make_task):
    tag_a = client.post("/api/tags", json={"name": "A"}).json()
    tag_b = client.post("/api/tags", json={"name": "B"}).json()
    task = make_task(tag_ids=[tag_a["id"]])

    updated = client.put(
        f"/api/tasks/{task['id']}",
        json={"title": "新标题", "priority": 1, "tag_ids": [tag_b["id"]], "due_date": None},
    ).json()
    assert updated["title"] == "新标题"
    assert updated["priority"] == 1
    assert [item["name"] for item in updated["tags"]] == ["B"]


def test_update_task_touches_updated_at(client, make_task):
    task = make_task()
    updated = client.put(f"/api/tasks/{task['id']}", json={"title": "改过的标题"}).json()
    assert updated["created_at"] == task["created_at"]
    assert updated["updated_at"] >= task["updated_at"]


def test_filter_by_status_priority_and_tag(client, statuses, make_task):
    tag = client.post("/api/tags", json={"name": "后端"}).json()
    high = make_task(title="写接口", priority=3, tag_ids=[tag["id"]])
    make_task(title="写文档", priority=1, description="关于接口的说明")

    by_priority = client.get("/api/tasks?priority=3").json()
    assert [item["id"] for item in by_priority] == [high["id"]]

    by_tag = client.get(f"/api/tasks?tag_id={tag['id']}").json()
    assert [item["id"] for item in by_tag] == [high["id"]]

    by_status = client.get(f"/api/tasks?status_id={statuses[0]['id']}").json()
    assert len(by_status) == 2


def test_search_matches_title_and_description(client, make_task):
    first = make_task(title="写接口")
    second = make_task(title="写文档", description="关于接口的说明")
    make_task(title="无关任务")

    found = {item["id"] for item in client.get("/api/tasks?q=接口").json()}
    assert found == {first["id"], second["id"]}


def test_sort_by_priority_desc(client, make_task):
    low = make_task(title="低", priority=1)
    high = make_task(title="高", priority=3)
    mid = make_task(title="中", priority=2)

    ids = [item["id"] for item in client.get("/api/tasks?sort=priority&order=desc").json()]
    assert ids == [high["id"], mid["id"], low["id"]]


def test_invalid_sort_field_rejected(client):
    assert client.get("/api/tasks?sort=unknown").status_code == 400


def test_archive_and_restore_task(client, make_task):
    task = make_task()

    archived = client.post(
        f"/api/tasks/{task['id']}/archive", json={"is_archived": True}
    ).json()
    assert archived["is_archived"] is True
    assert client.get("/api/tasks").json() == []
    assert len(client.get("/api/tasks?archived=true").json()) == 1

    client.post(f"/api/tasks/{task['id']}/archive", json={"is_archived": False})
    assert len(client.get("/api/tasks").json()) == 1


def test_move_task_updates_status_and_completed_at(client, statuses, make_task):
    done = next(item for item in statuses if item["is_done"])
    task = make_task(status_id=statuses[0]["id"])

    moved = client.put(
        f"/api/tasks/{task['id']}/move", json={"status_id": done["id"]}
    ).json()
    assert moved["status_id"] == done["id"]
    assert moved["completed_at"] is not None


def test_reorder_tasks(client, make_task):
    first = make_task(title="A")
    second = make_task(title="B")

    response = client.put(
        "/api/tasks/reorder", json={"ordered_ids": [second["id"], first["id"]]}
    )
    assert response.status_code == 204
    ids = [item["id"] for item in client.get("/api/tasks").json()]
    assert ids == [second["id"], first["id"]]


def test_delete_task(client, make_task):
    task = make_task()
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").status_code == 404
