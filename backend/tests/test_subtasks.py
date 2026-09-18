def test_subtask_crud(client, project, make_task):
    task = make_task(project["id"])

    created = client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "第一步"})
    assert created.status_code == 201
    subtask = created.json()
    assert subtask["is_done"] is False
    assert subtask["position"] == 1

    second = client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "第二步"}).json()
    assert second["position"] == 2

    listed = client.get(f"/api/tasks/{task['id']}/subtasks").json()
    assert [item["title"] for item in listed] == ["第一步", "第二步"]

    updated = client.put(
        f"/api/tasks/{task['id']}/subtasks/{subtask['id']}",
        json={"title": "第一步（改）", "is_done": True},
    ).json()
    assert updated["title"] == "第一步（改）"
    assert updated["is_done"] is True

    assert client.delete(f"/api/tasks/{task['id']}/subtasks/{subtask['id']}").status_code == 204
    assert len(client.get(f"/api/tasks/{task['id']}/subtasks").json()) == 1


def test_subtasks_are_nested_in_task_payload(client, project, make_task):
    task = make_task(project["id"])
    client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "子任务"})

    fetched = client.get(f"/api/tasks/{task['id']}").json()
    assert [item["title"] for item in fetched["subtasks"]] == ["子任务"]


def test_subtask_of_missing_task_returns_404(client):
    assert client.get("/api/tasks/99999/subtasks").status_code == 404


def test_subtask_id_must_belong_to_task(client, project, make_task):
    first = make_task(project["id"])
    second = make_task(project["id"])
    subtask = client.post(
        f"/api/tasks/{first['id']}/subtasks", json={"title": "子任务"}
    ).json()

    response = client.put(
        f"/api/tasks/{second['id']}/subtasks/{subtask['id']}", json={"is_done": True}
    )
    assert response.status_code == 404
