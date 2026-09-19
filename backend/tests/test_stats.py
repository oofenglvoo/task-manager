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
    # 默认优先级为第一条（低，id=1），另一条显式使用 id=3（高）。
    assert by_priority == {1: 2, 2: 0, 3: 1}
    assert [item["name"] for item in stats["by_priority"]] == ["低", "中", "高"]

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


def test_stats_overdue_uses_time_of_day(client, make_task):
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    past = (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M")
    future = (now + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M")
    make_task(title="已过时刻", due_date=past)
    make_task(title="尚未到点", due_date=future)

    stats = client.get("/api/stats").json()
    assert stats["overdue"] == 1
    assert stats["due_soon"] == 1


def test_stats_legacy_date_only_uses_end_of_day(client, make_task):
    # 旧数据只有日期时视为当天 23:59：今天不会算逾期，昨天会。
    from datetime import date, timedelta

    make_task(title="今天到期", due_date=date.today().isoformat())
    stats = client.get("/api/stats").json()
    assert stats["overdue"] == 0

    make_task(title="昨天到期", due_date=(date.today() - timedelta(days=1)).isoformat())
    stats = client.get("/api/stats").json()
    assert stats["overdue"] == 1
