def test_stats_counts_and_completion_rate(client, project, statuses, make_task):
    todo = statuses[0]["id"]
    done = next(item for item in statuses if item["is_done"])["id"]

    make_task(project["id"], title="过期任务", status_id=todo, due_date="2000-01-01")
    make_task(project["id"], title="已完成任务", status_id=done)
    make_task(project["id"], title="高优先级", status_id=todo, priority=3)

    stats = client.get(f"/api/stats?project_id={project['id']}").json()
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


def test_stats_archived_is_excluded_from_active(client, project, make_task):
    task = make_task(project["id"])
    client.post(f"/api/tasks/{task['id']}/archive", json={"is_archived": True})

    stats = client.get(f"/api/stats?project_id={project['id']}").json()
    assert stats["active"] == 0
    assert stats["archived"] == 1
    assert stats["completion_rate"] == 0.0


def test_stats_scoped_by_project(client, project, make_task):
    other = client.post("/api/projects", json={"name": "另一个"}).json()
    make_task(project["id"])
    make_task(other["id"])
    make_task(other["id"])

    stats = client.get(f"/api/stats?project_id={project['id']}").json()
    assert stats["active"] == 1

    all_stats = client.get("/api/stats").json()
    assert all_stats["active"] == 3


def test_stats_due_soon_window(client, project, make_task):
    from datetime import date, timedelta

    soon = (date.today() + timedelta(days=3)).isoformat()
    far = (date.today() + timedelta(days=30)).isoformat()
    make_task(project["id"], title="快到期", due_date=soon)
    make_task(project["id"], title="还早", due_date=far)

    stats = client.get(f"/api/stats?project_id={project['id']}").json()
    assert stats["due_soon"] == 1
    assert stats["overdue"] == 0
