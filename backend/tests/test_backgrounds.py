def test_upload_serve_delete_background(client):
    response = client.post(
        "/api/backgrounds",
        files={"file": ("bg.png", b"\x89PNG-fake-bytes", "image/png")},
    )
    assert response.status_code == 201, response.text
    url = response.json()["url"]
    assert url.startswith("/api/backgrounds/")

    served = client.get(url)
    assert served.status_code == 200
    assert served.content == b"\x89PNG-fake-bytes"

    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404


def test_upload_rejects_non_image(client):
    response = client.post(
        "/api/backgrounds",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400


def test_get_missing_background(client):
    assert client.get("/api/backgrounds/missing.png").status_code == 404
