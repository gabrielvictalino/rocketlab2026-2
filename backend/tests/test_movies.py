import concurrent.futures
import sqlite3

import pytest

BASE = "/api/v1/movies"


def create(client, auth, payload):
    response = client.post(BASE, json=payload, headers=auth)
    assert response.status_code == 201, response.text
    return response.json()


def test_crud_preserves_relationships_and_cascades(client, auth, movie_input, database):
    movie = create(client, auth, movie_input)
    movie_id = movie["sk_movie_id"]
    assert len(movie_id) == 64
    assert movie["nota_media"] is None
    assert movie["generos"] == ["Drama"]
    people = client.get(f"{BASE}/{movie_id}").json()["pessoas"]
    assert {"nome_pessoa": "Ana Silva", "tipo_pessoa": "Ator"} in people
    updated = {**movie_input, "titulo": "Outro horizonte", "generos": ["Aventura"]}
    response = client.put(f"{BASE}/{movie_id}", headers=auth, json=updated)
    assert response.status_code == 200, response.text
    assert response.json()["id_filme"] == movie["id_filme"]
    assert response.json()["generos"] == ["Aventura"]
    assert (
        client.post(
            f"{BASE}/{movie_id}/reviews",
            headers=auth,
            json={
                "nome": "Ana",
                "nota": 9,
                "comentario": "Ótimo filme",
            },
        ).status_code
        == 201
    )
    assert client.delete(f"{BASE}/{movie_id}", headers=auth).status_code == 204
    assert client.get(f"{BASE}/{movie_id}").status_code == 404
    assert client.delete(f"{BASE}/{movie_id}", headers=auth).status_code == 404
    with sqlite3.connect(database[0]) as db:
        for table in ("movie_reviews", "dim_reviews", "bridge_movie_person", "bridge_movie_genre"):
            assert db.execute(f"SELECT count(*) FROM {table}").fetchone()[0] == 0
        assert db.execute("SELECT count(*) FROM dim_genres").fetchone()[0] == 2


def test_reviews_average_zero_ten_and_pagination(client, auth, movie_input):
    movie = create(client, auth, movie_input)
    url = f"{BASE}/{movie['sk_movie_id']}"
    for grade in [0, 10, 5]:
        response = client.post(
            f"{url}/reviews",
            headers=auth,
            json={
                "nome": "Admin",
                "nota": grade,
                "comentario": f"Nota {grade}",
            },
        )
        assert response.status_code == 201
        assert response.json()["created_at"]
    detail = client.get(url).json()
    assert detail["nota_media"] == 5
    assert detail["total_avaliacoes"] == 3
    reviews = client.get(f"{url}/reviews?page=2&page_size=2").json()
    assert len(reviews["items"]) == 1
    assert reviews["total"] == 3
    assert reviews["pages"] == 2
    assert client.get(BASE).json()["items"][0]["nota_media"] == 5


def test_combined_filters_search_sort_and_pages(client, auth, movie_input):
    for title, year in [("Horizonte Azul", 2025), ("Horizonte Verde", 2026), ("Outro", 2026)]:
        create(client, auth, {**movie_input, "titulo": title, "ano_lancamento": year})
    response = client.get(
        BASE,
        params={
            "q": "horizonte",
            "ano": 2026,
            "genero": "Drama",
            "produtora": "Estúdio Norte",
        },
    ).json()
    assert response["total"] == 1
    assert response["items"][0]["titulo"] == "Horizonte Verde"
    first = client.get(BASE, params={"page_size": 2}).json()
    second = client.get(BASE, params={"page_size": 2, "page": 2}).json()
    assert first["total"] == 3 and first["pages"] == 2
    assert len(second["items"]) == 1
    assert not client.get(BASE, params={"q": "%"}).json()["items"]
    assert not client.get(BASE, params={"page": 99}).json()["items"]
    assert client.get(BASE, params={"nota_min": 0}).json()["total"] == 0
    movie_id = first["items"][0]["sk_movie_id"]
    client.post(
        f"{BASE}/{movie_id}/reviews",
        headers=auth,
        json={
            "nome": "Ana",
            "nota": 8.5,
            "comentario": "Excelente",
        },
    )
    assert client.get(BASE, params={"nota_min": 8, "nota_max": 9}).json()["total"] == 1
    assert client.get(f"{BASE}/filters").json()["anos"] == [2026, 2025]


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page_size": 101},
        {"nota_min": 9, "nota_max": 2},
    ],
)
def test_bad_pagination_and_filters(client, params):
    assert client.get(BASE, params=params).status_code == 422


@pytest.mark.parametrize(
    "field,value",
    [
        ("titulo", " "),
        ("ano_lancamento", 100),
        ("generos", []),
        ("diretores", []),
        ("sinopse", " "),
        ("data_lancamento", "2020-01-01"),
        ("duracao_minutos", -2),
    ],
)
def test_invalid_movie(client, auth, movie_input, field, value):
    assert client.post(BASE, headers=auth, json={**movie_input, field: value}).status_code == 422


@pytest.mark.parametrize("grade", [-1, 11])
def test_invalid_review(client, auth, movie_input, grade):
    movie = create(client, auth, movie_input)
    response = client.post(
        f"{BASE}/{movie['sk_movie_id']}/reviews",
        headers=auth,
        json={
            "nome": "Ana",
            "nota": grade,
            "comentario": "Resenha",
        },
    )
    assert response.status_code == 422
    assert client.get(f"{BASE}/{movie['sk_movie_id']}").json()["total_avaliacoes"] == 0


def test_missing_movie(client, auth, movie_input):
    assert client.get(f"{BASE}/missing").status_code == 404
    assert client.get(f"{BASE}/missing/reviews").status_code == 404
    assert client.put(f"{BASE}/missing", headers=auth, json=movie_input).status_code == 404
    assert (
        client.post(
            f"{BASE}/missing/reviews",
            headers=auth,
            json={
                "nome": "Ana",
                "nota": 5,
                "comentario": "Resenha",
            },
        ).status_code
        == 404
    )


def test_concurrent_reviews_keep_summary_consistent(client, auth, movie_input):
    movie = create(client, auth, movie_input)
    url = f"{BASE}/{movie['sk_movie_id']}"

    def review(grade):
        return client.post(
            f"{url}/reviews",
            headers=auth,
            json={
                "nome": "Admin",
                "nota": grade,
                "comentario": "Resenha concorrente",
            },
        ).status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        assert list(pool.map(review, [0, 2, 8, 10])) == [201] * 4
    assert client.get(url).json()["nota_media"] == 5
    assert client.get(url).json()["total_avaliacoes"] == 4
