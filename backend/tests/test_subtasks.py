def test_subtask_crud(client, make_task):
    task = make_task()

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


def test_subtasks_are_nested_in_task_payload(client, make_task):
    task = make_task()
    client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": "子任务"})

    fetched = client.get(f"/api/tasks/{task['id']}").json()
    assert [item["title"] for item in fetched["subtasks"]] == ["子任务"]


def test_subtask_of_missing_task_returns_404(client):
    assert client.get("/api/tasks/99999/subtasks").status_code == 404


def test_subtask_id_must_belong_to_task(client, make_task):
    first = make_task()
    second = make_task()
    subtask = client.post(
        f"/api/tasks/{first['id']}/subtasks", json={"title": "子任务"}
    ).json()

    response = client.put(
        f"/api/tasks/{second['id']}/subtasks/{subtask['id']}", json={"is_done": True}
    )
    assert response.status_code == 404


def test_subtask_reorder(client, make_task):
    task = make_task()
    ids = [
        client.post(f"/api/tasks/{task['id']}/subtasks", json={"title": title}).json()[
            "id"
        ]
        for title in ("甲", "乙", "丙")
    ]

    response = client.put(
        f"/api/tasks/{task['id']}/subtasks/reorder",
        json={"ordered_ids": [ids[2], ids[0], ids[1]]},
    )
    assert response.status_code == 204

    listed = client.get(f"/api/tasks/{task['id']}/subtasks").json()
    assert [item["title"] for item in listed] == ["丙", "甲", "乙"]
    assert [item["position"] for item in listed] == [1, 2, 3]


def test_subtask_reorder_rejects_foreign_id(client, make_task):
    first = make_task()
    second = make_task()
    own = client.post(f"/api/tasks/{first['id']}/subtasks", json={"title": "甲"}).json()
    foreign = client.post(
        f"/api/tasks/{second['id']}/subtasks", json={"title": "乙"}
    ).json()

    response = client.put(
        f"/api/tasks/{first['id']}/subtasks/reorder",
        json={"ordered_ids": [own["id"], foreign["id"]]},
    )
    assert response.status_code == 404
    listed = client.get(f"/api/tasks/{first['id']}/subtasks").json()
    assert [item["title"] for item in listed] == ["甲"]


def test_pinned_subtask_sorts_first(client, make_task):
    task = make_task()
    items = {
        title: client.post(
            f"/api/tasks/{task['id']}/subtasks", json={"title": title}
        ).json()
        for title in ("甲", "乙", "丙")
    }

    pinned = client.put(
        f"/api/tasks/{task['id']}/subtasks/{items['乙']['id']}",
        json={"is_pinned": True},
    )
    assert pinned.status_code == 200
    assert pinned.json()["is_pinned"] is True

    listed = client.get(f"/api/tasks/{task['id']}/subtasks").json()
    assert [item["title"] for item in listed] == ["乙", "甲", "丙"]

    # 取消置顶后回到原 position 顺序（非永久置顶）。
    client.put(
        f"/api/tasks/{task['id']}/subtasks/{items['乙']['id']}",
        json={"is_pinned": False},
    )
    listed = client.get(f"/api/tasks/{task['id']}/subtasks").json()
    assert [item["title"] for item in listed] == ["甲", "乙", "丙"]


def test_subtask_reorder_keeps_pinned_first(client, make_task):
    task = make_task()
    items = {
        title: client.post(
            f"/api/tasks/{task['id']}/subtasks", json={"title": title}
        ).json()
        for title in ("甲", "乙", "丙")
    }
    client.put(
        f"/api/tasks/{task['id']}/subtasks/{items['乙']['id']}",
        json={"is_pinned": True},
    )

    response = client.put(
        f"/api/tasks/{task['id']}/subtasks/reorder",
        json={
            "ordered_ids": [
                items["丙"]["id"],
                items["甲"]["id"],
                items["乙"]["id"],
            ]
        },
    )
    assert response.status_code == 204

    listed = client.get(f"/api/tasks/{task['id']}/subtasks").json()
    assert [item["title"] for item in listed] == ["乙", "丙", "甲"]
