def test_stats_counts_and_completion_rate(client, statuses, make_task):
    todo = statuses[0]["id"]
    done = next(item for item in statuses if item["is_done"])["id"]

    make_task(title="过期任务", status_id=todo, due_date="2000-01-01")
    make_task(title="已完成任务", status_id=done)
    make_task(title="高优先级", status_id=todo, priority=3)

    stats = client.get("/api/stats").json()
    assert stats["active"] == 3
    assert stats["archived"] == 0
    assert stats["completed"] == 1
    assert stats["completion_rate"] == 33.3
    assert stats["overdue"] == 1

    by_priority = {item["priority"]: item["count"] for item in stats["by_priority"]}
    assert by_priority == {1: 0, 2: 2, 3: 1}

    by_status = {item["status_id"]: item["count"] for item in stats["by_status"]}
    assert by_status[todo] == 2
    assert by_status[done] == 1


def test_stats_archived_is_excluded_from_active(client, make_task):
    task = make_task()
    client.post(f"/api/tasks/{task['id']}/archive", json={"is_archived": True})

    stats = client.get("/api/stats").json()
    assert stats["active"] == 0
    assert stats["archived"] == 1
    assert stats["completion_rate"] == 0.0


def test_stats_due_soon_window(client, make_task):
    from datetime import date, timedelta

    soon = (date.today() + timedelta(days=3)).isoformat()
    far = (date.today() + timedelta(days=30)).isoformat()
    make_task(title="快到期", due_date=soon)
    make_task(title="还早", due_date=far)

    stats = client.get("/api/stats").json()
    assert stats["due_soon"] == 1
    assert stats["overdue"] == 0
