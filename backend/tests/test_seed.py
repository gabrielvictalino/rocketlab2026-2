import csv
import sqlite3
from hashlib import sha256

import pytest

from app.scripts import seed as loader


def key(value):
    return sha256(value.encode()).hexdigest()


def write_csv(directory, filename, rows):
    with (directory / filename).open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


@pytest.fixture
def csvs(tmp_path):
    directory = tmp_path / "csv"
    directory.mkdir()
    movie_id = key("movie")
    write_csv(
        directory,
        "dim_movies.csv",
        [
            {
                "sk_movie_id": movie_id,
                "id_filme": "1",
                "titulo": "Seed",
            }
        ],
    )
    write_csv(directory, "dim_genres.csv", [{"sk_genre_id": key("genre"), "nome_genero": "Drama"}])
    write_csv(
        directory,
        "dim_companies.csv",
        [
            {
                "sk_company_id": key("company"),
                "nome_produtora": "Estúdio",
            }
        ],
    )
    write_csv(
        directory,
        "dim_people.csv",
        [
            {
                "sk_person_id": key("person"),
                "nome_pessoa": "Maria",
                "tipo_pessoa": "Diretor",
            }
        ],
    )
    for table, entity in [
        ("bridge_movie_genre", "genre"),
        ("bridge_movie_company", "company"),
        ("bridge_movie_person", "person"),
    ]:
        write_csv(
            directory,
            f"{table}.csv",
            [
                {
                    "sk_movie_id": movie_id,
                    f"sk_{entity}_id": key(entity),
                }
            ],
        )
    write_csv(
        directory,
        "fact_movies_performance.csv",
        [
            {
                "sk_movie_id": movie_id,
                "receita_usd": "123.45",
            }
        ],
    )
    write_csv(
        directory,
        "dim_reviews.csv",
        [
            {
                "sk_review_id": key("summary"),
                "sk_movie_id": movie_id,
                "qtd_avaliacoes_usuarios": "999",
                "nota_media_usuarios": "9",
            }
        ],
    )
    write_csv(
        directory,
        "movies_reviews.csv",
        [
            {
                "sk_movie_review_id": key(f"review{i}"),
                "sk_movie_id": movie_id,
                "nome": "Ana",
                "nota": grade,
                "comentario": "Muito bom",
            }
            for i, grade in enumerate([0, 10])
        ],
    )
    return directory


async def test_seed_idempotent_and_rebuilds_summary(database, csvs, monkeypatch):
    monkeypatch.setattr(loader, "AsyncSessionLocal", database[1])
    for _ in range(2):
        result = await loader.seed(csvs)
        assert len(result) == 10
    with sqlite3.connect(database[0]) as db:
        assert db.execute("SELECT count(*) FROM dim_movies").fetchone()[0] == 1
        assert db.execute("SELECT count(*) FROM movie_reviews").fetchone()[0] == 2
        assert db.execute("SELECT count(*) FROM bridge_movie_genre").fetchone()[0] == 1
        assert db.execute(
            "SELECT qtd_avaliacoes_usuarios, nota_media_usuarios FROM dim_reviews"
        ).fetchone() == (2, 5)
        assert db.execute("SELECT created_at FROM movie_reviews").fetchone()[0]


async def test_seed_rolls_back_every_file_on_orphan(database, csvs, monkeypatch):
    monkeypatch.setattr(loader, "AsyncSessionLocal", database[1])
    write_csv(
        csvs,
        "bridge_movie_genre.csv",
        [
            {
                "sk_movie_id": key("missing"),
                "sk_genre_id": key("genre"),
            }
        ],
    )
    with pytest.raises(ValueError, match="bridge_movie_genre.csv, linha 2"):
        await loader.seed(csvs)
    with sqlite3.connect(database[0]) as db:
        assert db.execute("SELECT count(*) FROM dim_movies").fetchone()[0] == 0


async def test_seed_missing_file_and_invalid_value(database, csvs, monkeypatch):
    monkeypatch.setattr(loader, "AsyncSessionLocal", database[1])
    (csvs / "dim_people.csv").unlink()
    with pytest.raises(ValueError, match="Arquivos ausentes"):
        await loader.seed(csvs)
    write_csv(
        csvs,
        "dim_movies.csv",
        [
            {
                "sk_movie_id": "bad-key",
                "id_filme": "1",
                "titulo": "Invalid",
            }
        ],
    )
    with pytest.raises(ValueError, match="64 caracteres"):
        await loader.seed(csvs, allow_partial=True)


async def test_partial_dimensions_then_complete_batch(database, csvs, tmp_path, monkeypatch):
    monkeypatch.setattr(loader, "AsyncSessionLocal", database[1])
    partial = tmp_path / "partial"
    partial.mkdir()
    (partial / "dim_movies.csv").write_bytes((csvs / "dim_movies.csv").read_bytes())
    await loader.seed(partial, allow_partial=True)
    await loader.seed(csvs)
    with sqlite3.connect(database[0]) as db:
        assert db.execute("SELECT count(*) FROM dim_reviews").fetchone()[0] == 1
        assert db.execute("SELECT nota_media_usuarios FROM dim_reviews").fetchone()[0] == 5
