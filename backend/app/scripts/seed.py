"""Transactional, idempotent import of the Diamond CSVs into an Alembic database."""

import argparse
import asyncio
import csv
import math
import re
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy import Date, DateTime, Double, Integer, Numeric, String, func, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.movies.models import DimMovie, DimReview, MovieReview
from app.movies.service import begin_write

FILES = (
    ("dim_movies.csv", "dim_movies"),
    ("dim_genres.csv", "dim_genres"),
    ("dim_companies.csv", "dim_companies"),
    ("dim_people.csv", "dim_people"),
    ("bridge_movie_genre.csv", "bridge_movie_genre"),
    ("bridge_movie_company.csv", "bridge_movie_company"),
    ("bridge_movie_person.csv", "bridge_movie_person"),
    ("fact_movies_performance.csv", "fact_movies_performance"),
    ("dim_reviews.csv", "dim_reviews"),
    ("movies_reviews.csv", "movie_reviews"),
)


def parse_value(column, raw: str | None):
    if raw is None or raw.strip().lower() in {"", "null", "none", "nan"}:
        if column.nullable:
            return None
        raise ValueError(f"{column.name}: valor obrigatório")
    value = raw.strip()
    if column.name.startswith("sk_") and not re.fullmatch(r"[a-fA-F0-9]{64}", value):
        raise ValueError(f"{column.name}: chave deve ter 64 caracteres hexadecimais")
    if isinstance(column.type, DateTime):
        return datetime.fromisoformat(value)
    if isinstance(column.type, Date):
        return date.fromisoformat(value)
    if isinstance(column.type, Integer):
        number = Decimal(value)
        if not number.is_finite() or number != number.to_integral_value():
            raise ValueError(f"{column.name}: inteiro inválido")
        return int(number)
    if isinstance(column.type, (Double, Numeric)):
        number = float(value)
        if not math.isfinite(number):
            raise ValueError(f"{column.name}: número não finito")
        return Decimal(value) if isinstance(column.type, Numeric) else number
    if isinstance(column.type, String) and column.type.length and len(value) > column.type.length:
        raise ValueError(f"{column.name}: texto excede {column.type.length} caracteres")
    return value


async def import_file(db: AsyncSession, path: Path, table_name: str) -> int:
    table = Base.metadata.tables[table_name]
    count = 0
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        headers = set(reader.fieldnames or [])
        unknown = headers - set(table.columns.keys())
        required = {
            c.name
            for c in table.columns
            if not c.nullable and c.server_default is None and c.default is None
        } | set(table.primary_key.columns.keys())
        if unknown or required - headers:
            raise ValueError(
                f"{path.name}: colunas desconhecidas {sorted(unknown)}; "
                f"colunas ausentes {sorted(required - headers)}"
            )
        for line, row in enumerate(reader, start=2):
            try:
                if None in row:
                    raise ValueError("Quantidade de colunas inválida")
                values = {key: parse_value(table.c[key], value) for key, value in row.items()}
                stmt = insert(table).values(**values)
                updates = {
                    key: getattr(stmt.excluded, key)
                    for key in values
                    if key not in table.primary_key.columns
                }
                if table_name == "dim_reviews":
                    # A previous partial batch may already have generated a summary
                    # for this film; preserve its surrogate key.
                    stmt = stmt.on_conflict_do_update(index_elements=["sk_movie_id"], set_=updates)
                elif updates:
                    stmt = stmt.on_conflict_do_update(
                        index_elements=list(table.primary_key.columns), set_=updates
                    )
                else:
                    stmt = stmt.on_conflict_do_nothing()
                await db.execute(stmt)
            except Exception as exc:
                raise ValueError(f"{path.name}, linha {line}: {exc}") from exc
            count += 1
    return count


async def rebuild_summaries(db: AsyncSession) -> None:
    # Individual reviews are the source of truth, including films with zero reviews.
    rows = (
        await db.execute(
            select(
                DimMovie.sk_movie_id,
                func.count(MovieReview.sk_movie_review_id),
                func.avg(MovieReview.nota),
            )
            .outerjoin(MovieReview)
            .group_by(DimMovie.sk_movie_id)
        )
    ).all()
    for movie_id, count, average in rows:
        stmt = insert(DimReview).values(
            sk_movie_id=movie_id, qtd_avaliacoes_usuarios=count, nota_media_usuarios=average
        )
        await db.execute(
            stmt.on_conflict_do_update(
                index_elements=["sk_movie_id"],
                set_={"qtd_avaliacoes_usuarios": count, "nota_media_usuarios": average},
            )
        )


async def seed(directory: Path, *, allow_partial: bool = False) -> dict[str, int]:
    paths = [(directory / filename, table) for filename, table in FILES]
    missing = [p.name for p, _ in paths if not p.is_file()]
    if missing and not allow_partial:
        raise ValueError(f"Arquivos ausentes: {', '.join(missing)}")
    if len(missing) == len(paths):
        raise ValueError("Nenhum CSV reconhecido encontrado.")
    async with AsyncSessionLocal() as db:
        try:
            await begin_write(db)
            result = {
                path.name: await import_file(db, path, table)
                for path, table in paths
                if path.is_file()
            }
            await rebuild_summaries(db)
            await db.commit()
            return result
        except Exception:
            await db.rollback()
            raise


async def run(directory: Path, allow_partial: bool) -> None:
    try:
        counts = await seed(directory, allow_partial=allow_partial)
        for filename, count in counts.items():
            print(f"{filename}: {count} linhas processadas")
        print("Carga concluída; resumos recalculados pelas avaliações individuais.")
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="Pasta dos CSVs Diamond")
    parser.add_argument("--allow-partial", action="store_true", help="Permitir lote incompleto")
    args = parser.parse_args()
    try:
        asyncio.run(run(args.directory, args.allow_partial))
    except Exception as exc:
        raise SystemExit(f"Carga cancelada e revertida: {exc}") from exc


if __name__ == "__main__":
    main()
