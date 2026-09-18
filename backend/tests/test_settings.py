def test_get_default_settings(client):
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["theme"] == "system"
    assert data["card_size"] == "md"
    assert data["background_url"] is None


def test_update_settings(client):
    response = client.put(
        "/api/settings",
        json={
            "theme": "dark",
            "card_size": "lg",
            "background_url": "/api/backgrounds/demo.png",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["theme"] == "dark"
    assert data["card_size"] == "lg"
    assert data["background_url"] == "/api/backgrounds/demo.png"
    assert client.get("/api/settings").json() == data


def test_update_settings_partial(client):
    client.put("/api/settings", json={"theme": "light"})
    data = client.get("/api/settings").json()
    assert data["theme"] == "light"
    assert data["card_size"] == "md"


def test_clear_background(client):
    client.put("/api/settings", json={"background_url": "/api/backgrounds/demo.png"})
    response = client.put("/api/settings", json={"background_url": None})
    assert response.json()["background_url"] is None


def test_invalid_theme_rejected(client):
    assert client.put("/api/settings", json={"theme": "rainbow"}).status_code == 400


def test_invalid_card_size_rejected(client):
    assert client.put("/api/settings", json={"card_size": "huge"}).status_code == 400
