from app.core.security import issue_token


def test_all_write_routes_require_login(client, movie_input):
    for method, path, data in [
        ("post", "/movies", movie_input),
        ("put", "/movies/missing", movie_input),
        ("delete", "/movies/missing", None),
        ("post", "/movies/missing/reviews", {"nome": "Ana", "nota": 5, "comentario": "Bom"}),
    ]:
        response = client.request(method, f"/api/v1{path}", json=data)
        assert response.status_code == 401
    assert client.get("/api/v1/movies").status_code == 200


def test_login_and_token_validation(client, database, auth):
    response = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrong"})
    assert response.status_code == 401
    assert client.get("/api/v1/auth/me", headers=auth).json() == {"username": "admin"}
    tampered = {"Authorization": auth["Authorization"] + "tampered"}
    assert client.get("/api/v1/auth/me", headers=tampered).status_code == 401
    token = issue_token(database[2])
    valid = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/v1/auth/me", headers=valid).status_code == 200
