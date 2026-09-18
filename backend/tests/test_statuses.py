def test_create_status(client):
    response = client.post(
        "/api/statuses", json={"name": "阻塞", "color": "#ef4444", "is_done": False}
    )
    assert response.status_code == 201
    status = response.json()
    assert status["name"] == "阻塞"
    assert status["position"] == 4


def test_create_duplicate_status_conflicts(client):
    response = client.post("/api/statuses", json={"name": "待办"})
    assert response.status_code == 409


def test_update_status(client, statuses):
    todo = statuses[0]
    updated = client.put(
        f"/api/statuses/{todo['id']}", json={"name": "待处理", "is_done": True}
    ).json()
    assert updated["name"] == "待处理"
    assert updated["is_done"] is True


def test_delete_status_in_use_is_blocked(client, statuses, make_task):
    make_task(status_id=statuses[0]["id"])
    response = client.delete(f"/api/statuses/{statuses[0]['id']}")
    assert response.status_code == 400
    assert "移动" in response.json()["detail"]


def test_delete_unused_status(client, statuses):
    created = client.post("/api/statuses", json={"name": "临时"}).json()
    assert client.delete(f"/api/statuses/{created['id']}").status_code == 204
    assert created["id"] not in [item["id"] for item in client.get("/api/statuses").json()]


def test_reorder_statuses(client, statuses):
    reversed_ids = [item["id"] for item in reversed(statuses)]
    response = client.put(
        "/api/statuses/reorder", json={"ordered_ids": reversed_ids}
    )
    assert response.status_code == 204
    assert [item["id"] for item in client.get("/api/statuses").json()] == reversed_ids
