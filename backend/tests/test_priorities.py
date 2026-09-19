def test_default_priorities(client):
    priorities = client.get("/api/priorities").json()
    assert [item["name"] for item in priorities] == ["低", "中", "高"]
    assert [item["level"] for item in priorities] == [1, 2, 3]
    assert all(item["task_count"] == 0 for item in priorities)


def test_create_priority(client):
    created = client.post(
        "/api/priorities", json={"name": "紧急", "color": "#ff0000", "level": 4}
    )
    assert created.status_code == 201
    data = created.json()
    assert data["name"] == "紧急"
    assert data["level"] == 4
    priorities = client.get("/api/priorities").json()
    assert priorities[-1]["name"] == "紧急"


def test_create_priority_default_level(client):
    created = client.post("/api/priorities", json={"name": "稍后"}).json()
    assert created["level"] == 4


def test_duplicate_priority_conflicts(client):
    assert client.post("/api/priorities", json={"name": "高"}).status_code == 409


def test_blank_priority_name_fails(client):
    assert client.post("/api/priorities", json={"name": "  "}).status_code == 400


def test_update_priority(client):
    priorities = client.get("/api/priorities").json()
    first = priorities[0]
    updated = client.put(
        f"/api/priorities/{first['id']}", json={"name": "低优先级", "color": "#111111"}
    ).json()
    assert updated["name"] == "低优先级"
    assert updated["color"] == "#111111"


def test_reorder_priorities(client):
    priorities = client.get("/api/priorities").json()
    ids = [item["id"] for item in reversed(priorities)]
    assert client.put("/api/priorities/reorder", json={"ordered_ids": ids}).status_code == 204
    assert [item["id"] for item in client.get("/api/priorities").json()] == ids


def test_priority_task_count(client, make_task):
    priorities = client.get("/api/priorities").json()
    make_task(priority=priorities[2]["id"])
    make_task(priority=priorities[2]["id"])
    fetched = next(
        item for item in client.get("/api/priorities").json() if item["id"] == priorities[2]["id"]
    )
    assert fetched["task_count"] == 2


def test_delete_priority_in_use_fails(client, make_task):
    priorities = client.get("/api/priorities").json()
    make_task(priority=priorities[0]["id"])
    response = client.delete(f"/api/priorities/{priorities[0]['id']}")
    assert response.status_code == 400


def test_delete_last_priority_fails(client):
    priorities = client.get("/api/priorities").json()
    # 删到只剩一条为止。
    for item in priorities[1:]:
        assert client.delete(f"/api/priorities/{item['id']}").status_code == 204
    remaining = client.get("/api/priorities").json()
    assert len(remaining) == 1
    assert client.delete(f"/api/priorities/{remaining[0]['id']}").status_code == 400


def test_unknown_priority_reference_fails(client):
    assert client.post("/api/tasks", json={"title": "任务", "priority": 999}).status_code == 404
