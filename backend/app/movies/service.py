from sqlalchemy import delete, func, select, text
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.movies.models import (
    DimCompany,
    DimGenre,
    DimMovie,
    DimPerson,
    DimReview,
    MovieReview,
    generate_surrogate_key,
)
from app.movies.schemas import MovieInput

MOVIE_OPTIONS = (
    selectinload(DimMovie.genres),
    selectinload(DimMovie.companies),
    selectinload(DimMovie.people),
    selectinload(DimMovie.reviews_summary),
    selectinload(DimMovie.performance),
)


async def begin_write(db: AsyncSession) -> None:
    # Acquire the SQLite writer lock before reading: concurrent reviews cannot
    # overwrite each other's aggregates. Commit/rollback releases the lock.
    await db.execute(text("BEGIN IMMEDIATE"))


async def get_movie(db: AsyncSession, movie_id: str) -> DimMovie | None:
    result = await db.execute(
        select(DimMovie)
        .where(DimMovie.sk_movie_id == movie_id)
        .options(*MOVIE_OPTIONS)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


def serialize_movie(movie: DimMovie, *, detail: bool = False) -> dict:
    summary = movie.reviews_summary
    result = {column.name: getattr(movie, column.name) for column in DimMovie.__table__.columns}
    result.update(
        generos=[g.nome_genero for g in movie.genres],
        produtoras=[c.nome_produtora for c in movie.companies],
        diretores=[p.nome_pessoa for p in movie.people if p.tipo_pessoa == "Diretor"],
        pessoas=[
            {"nome_pessoa": p.nome_pessoa, "tipo_pessoa": p.tipo_pessoa} for p in movie.people
        ],
        nota_media=summary.nota_media_usuarios if summary else None,
        total_avaliacoes=summary.qtd_avaliacoes_usuarios if summary else 0,
    )
    if detail:
        performance = movie.performance
        result["performance"] = (
            {
                c.name: getattr(performance, c.name)
                for c in performance.__table__.columns
                if c.name != "sk_movie_id"
            }
            if performance
            else None
        )
    return result


async def dimension(db: AsyncSession, model, **values):
    statement = insert(model).values(**values).on_conflict_do_nothing()
    await db.execute(statement)
    return (await db.execute(select(model).filter_by(**values))).scalar_one()


async def save_movie(db: AsyncSession, data: MovieInput, movie: DimMovie | None = None) -> str:
    is_new = movie is None
    if movie is None:
        movie = DimMovie(id_filme=f"local-{generate_surrogate_key()[:32]}")
    values = data.model_dump(exclude={"diretores", "generos", "produtoras", "pessoas"})
    for field in ("url_poster", "url_backdrop"):
        values[field] = str(values[field]) if values[field] else None
    for key, value in values.items():
        setattr(movie, key, value)
    movie.genres = [
        await dimension(db, DimGenre, nome_genero=name) for name in dict.fromkeys(data.generos)
    ]
    movie.companies = [
        await dimension(db, DimCompany, nome_produtora=name)
        for name in dict.fromkeys(data.produtoras)
    ]
    people = {(p.nome_pessoa, p.tipo_pessoa) for p in data.pessoas if p.tipo_pessoa != "Diretor"}
    people.update((name, "Diretor") for name in data.diretores)
    movie.people = [
        await dimension(db, DimPerson, nome_pessoa=name, tipo_pessoa=role)
        for name, role in sorted(people)
    ]
    if is_new:
        db.add(movie)
    await db.flush()
    if is_new:
        await refresh_summary(db, movie.sk_movie_id)
    return movie.sk_movie_id


async def refresh_summary(db: AsyncSession, movie_id: str) -> None:
    count, average = (
        await db.execute(
            select(func.count(MovieReview.sk_movie_review_id), func.avg(MovieReview.nota)).where(
                MovieReview.sk_movie_id == movie_id
            )
        )
    ).one()
    stmt = insert(DimReview).values(
        sk_movie_id=movie_id, qtd_avaliacoes_usuarios=count, nota_media_usuarios=average
    )
    await db.execute(
        stmt.on_conflict_do_update(
            index_elements=["sk_movie_id"],
            set_={"qtd_avaliacoes_usuarios": count, "nota_media_usuarios": average},
        )
    )


async def delete_movie(db: AsyncSession, movie_id: str) -> bool:
    result = await db.execute(delete(DimMovie).where(DimMovie.sk_movie_id == movie_id))
    return result.rowcount > 0
