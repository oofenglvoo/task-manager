def test_create_task_uses_defaults(client, statuses, make_task):
    task = make_task()
    assert task["title"] == "任务"
    # 默认使用第一条优先级（低，level 1）。
    assert task["priority"] == 1
    assert task["status_id"] == statuses[0]["id"]
    assert task["completed_at"] is None
    assert task["due_date"] is None
    # 默认不自定义颜色（前端按优先级取便签底色）。
    assert task["color"] is None
    assert task["tags"] == []
    assert task["subtasks"] == []
    assert task["created_at"] is not None
    assert task["updated_at"] is not None


def test_task_color_can_be_set_and_cleared(client, make_task):
    task = make_task(color="#ff00aa")
    assert task["color"] == "#ff00aa"

    updated = client.put(f"/api/tasks/{task['id']}", json={"color": "#00ff00"}).json()
    assert updated["color"] == "#00ff00"

    cleared = client.put(f"/api/tasks/{task['id']}", json={"color": None}).json()
    assert cleared["color"] is None


def test_create_task_with_all_fields(client, make_task):
    tag = client.post("/api/tags", json={"name": "紧急"}).json()
    task = make_task(
        title="  发布版本  ",
        tag_ids=[tag["id"]],
        due_date="2026-10-01T18:30",
        priority=3,
        description="打 tag 并推送",
    )
    assert task["title"] == "发布版本"
    assert task["priority"] == 3
    # 带时分的截止日期原样保存。
    assert task["due_date"] == "2026-10-01T18:30:00"
    assert [item["name"] for item in task["tags"]] == ["紧急"]


def test_create_task_with_date_only_due_date_uses_end_of_day(client, make_task):
    # 兼容旧客户端/旧备份的纯日期：视为当天 23:59。
    task = make_task(title="旧格式", due_date="2026-10-01")
    assert task["due_date"] == "2026-10-01T23:59:00"


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


def test_update_task_with_legacy_text_due_date_does_not_crash(client, make_task):
    """回归：旧库 due_date 是纯日期文本，更新任务时不应 500。

    `build_history_snapshot` 曾直接调用 `.isoformat()`；迁移后读回来是
    datetime，但日期部分按 23:59 还原。
    """
    from sqlalchemy import text

    from app.database import engine

    task = make_task(title="旧任务", due_date="2026-09-20T23:59")

    with engine.begin() as connection:
        connection.execute(
            text("UPDATE tasks SET due_date = '2026-09-20' WHERE id = :id"),
            {"id": task["id"]},
        )

    response = client.put(f"/api/tasks/{task['id']}", json={"title": "改过"})
    assert response.status_code == 200, response.text
    assert response.json()["title"] == "改过"


def test_due_date_normalized_to_minute_precision(client, make_task):
    """秒级/纯日期的写入值统一截断到分钟，历史快照同样保持分钟精度。"""
    task = make_task(title="精度", due_date="2026-10-01T18:30")
    assert task["due_date"] == "2026-10-01T18:30:00"

    client.put(f"/api/tasks/{task['id']}", json={"due_date": "2026-10-01T18:30:45.123456"})
    updated = client.get(f"/api/tasks/{task['id']}").json()
    assert updated["due_date"] == "2026-10-01T18:30:00"

    history = client.get(f"/api/tasks/{task['id']}/history").json()
    assert history[0]["snapshot"]["due_date"] == "2026-10-01T18:30:00"


def test_due_date_migration_rewrites_legacy_forms():
    """迁移必须把三种旧形态都写成 ISO 文本。

    数字亲和性值（`20260920235900`）会让 SQLite 把列判成 NUMERIC，
    SQLAlchemy 的 datetime 处理器随后抛
    `TypeError: fromisoformat: argument must be str` —— 这正是保存任务
    时 500 的根因。
    """
    from sqlalchemy import text

    from app.database import engine, ensure_schema

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO tasks (title, priority, position, is_archived, "
                "created_at, updated_at, due_date) VALUES "
                "('numeric', 1, 1, 0, '2026-01-01 00:00:00', "
                "'2026-01-01 00:00:00', 20260920235900), "
                "('dateonly', 1, 2, 0, '2026-01-01 00:00:00', "
                "'2026-01-01 00:00:00', '2026-09-20'), "
                "('seconds', 1, 3, 0, '2026-01-01 00:00:00', "
                "'2026-01-01 00:00:00', '2026-09-20T18:30:45')"
            )
        )

    ensure_schema()

    with engine.begin() as connection:
        rows = connection.execute(
            text("SELECT title, typeof(due_date), due_date FROM tasks ORDER BY position")
        ).fetchall()
    assert [(row[0], row[1], row[2]) for row in rows] == [
        ("numeric", "text", "2026-09-20T23:59:00"),
        ("dateonly", "text", "2026-09-20T23:59:00"),
        ("seconds", "text", "2026-09-20T18:30:00"),
    ]


def test_history_snapshot_handles_legacy_date_only(client, make_task):
    """历史快照里的纯日期 due_date 会被迁移清洗为 23:59。"""
    from sqlalchemy import text

    from app.database import engine, ensure_schema

    task = make_task(title="A", due_date="2026-09-20T23:59")
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE tasks SET due_date = '2026-09-20' WHERE id = :id"),
            {"id": task["id"]},
        )
        connection.execute(
            text(
                "UPDATE task_history SET snapshot = "
                "REPLACE(snapshot, '\"due_date\": \"2026-09-20T23:59:00\"', "
                "'\"due_date\": \"2026-09-20\"')"
            )
        )
    # 真实旧库是在启动时跑迁移的，这里显式补上。
    ensure_schema()

    response = client.put(f"/api/tasks/{task['id']}", json={"title": "B"})
    assert response.status_code == 200, response.text
    snapshot = client.get(f"/api/tasks/{task['id']}/history").json()[0]["snapshot"]
    assert snapshot["due_date"] == "2026-09-20T23:59:00"


def test_as_datetime_handles_all_legacy_shapes():
    """`crud.as_datetime` 是读路径的兜底，必须覆盖所有历史形态。"""
    from datetime import date, datetime

    from app.crud import as_datetime

    assert as_datetime(None) is None
    assert as_datetime("") is None
    assert as_datetime("2026-09-20") == datetime(2026, 9, 20, 23, 59)
    assert as_datetime("2026-09-20T23:59") == datetime(2026, 9, 20, 23, 59)
    assert as_datetime("2026-09-20T23:59:00") == datetime(2026, 9, 20, 23, 59)
    assert as_datetime("2026-09-20T18:30:45.123") == datetime(2026, 9, 20, 18, 30)
    assert as_datetime("20260920235900") == datetime(2026, 9, 20, 23, 59)
    assert as_datetime(20260920235900) == datetime(2026, 9, 20, 23, 59)
    assert as_datetime(date(2026, 9, 20)) == datetime(2026, 9, 20, 23, 59)
    assert as_datetime(datetime(2026, 9, 20, 18, 30)) == datetime(2026, 9, 20, 18, 30)
    assert as_datetime("not-a-date") is None
    assert as_datetime(b"x") is None
