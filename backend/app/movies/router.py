import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_admin
from app.db.session import get_db
from app.movies.models import DimCompany, DimGenre, DimMovie, DimReview, MovieReview
from app.movies.schemas import MovieInput, ReviewInput, ReviewOutput
from app.movies.service import (
    MOVIE_OPTIONS,
    begin_write,
    delete_movie,
    get_movie,
    refresh_summary,
    save_movie,
    serialize_movie,
)

router = APIRouter()
DB = Annotated[AsyncSession, Depends(get_db)]
WriteAccess = Depends(require_admin)


@router.get("")
async def list_movies(
    db: DB,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    q: str = Query(default="", max_length=200),
    genero: str | None = Query(default=None, max_length=50),
    ano: int | None = Query(default=None, ge=1888, le=2200),
    produtora: str | None = Query(default=None, max_length=255),
    nota_min: float | None = Query(default=None, ge=0, le=10),
    nota_max: float | None = Query(default=None, ge=0, le=10),
) -> dict:
    if nota_min is not None and nota_max is not None and nota_min > nota_max:
        raise HTTPException(422, "A nota mínima deve ser menor ou igual à máxima.")
    statement = select(DimMovie).outerjoin(DimReview)
    if q.strip():
        statement = statement.where(DimMovie.titulo.icontains(q.strip(), autoescape=True))
    if genero:
        statement = statement.where(DimMovie.genres.any(DimGenre.nome_genero == genero))
    if produtora:
        statement = statement.where(DimMovie.companies.any(DimCompany.nome_produtora == produtora))
    if ano is not None:
        statement = statement.where(DimMovie.ano_lancamento == ano)
    if nota_min is not None:
        statement = statement.where(DimReview.nota_media_usuarios >= nota_min)
    if nota_max is not None:
        statement = statement.where(DimReview.nota_media_usuarios <= nota_max)
    total = (await db.scalar(select(func.count()).select_from(statement.subquery()))) or 0
    movies = (
        await db.scalars(
            statement.options(*MOVIE_OPTIONS)
            .order_by(DimMovie.sk_movie_id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return {
        "items": [serialize_movie(m) for m in movies],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size),
    }


@router.get("/filters")
async def filters(db: DB) -> dict:
    return {
        "generos": list(
            await db.scalars(select(DimGenre.nome_genero).order_by(DimGenre.nome_genero))
        ),
        "produtoras": list(
            await db.scalars(select(DimCompany.nome_produtora).order_by(DimCompany.nome_produtora))
        ),
        "anos": list(
            await db.scalars(
                select(DimMovie.ano_lancamento)
                .where(DimMovie.ano_lancamento.is_not(None))
                .distinct()
                .order_by(DimMovie.ano_lancamento.desc())
            )
        ),
    }


@router.get("/{movie_id}")
async def movie_detail(movie_id: str, db: DB) -> dict:
    movie = await get_movie(db, movie_id)
    if movie is None:
        raise HTTPException(404, "Filme não encontrado.")
    return serialize_movie(movie, detail=True)


@router.post("", status_code=201, dependencies=[WriteAccess])
async def create_movie(data: MovieInput, db: DB, response: Response) -> dict:
    await begin_write(db)
    movie_id = await save_movie(db, data)
    await db.commit()
    response.headers["Location"] = f"movies/{movie_id}"
    return serialize_movie(await get_movie(db, movie_id), detail=True)


@router.put("/{movie_id}", dependencies=[WriteAccess])
async def update_movie(movie_id: str, data: MovieInput, db: DB) -> dict:
    await begin_write(db)
    movie = await get_movie(db, movie_id)
    if movie is None:
        raise HTTPException(404, "Filme não encontrado.")
    await save_movie(db, data, movie)
    await db.commit()
    return serialize_movie(await get_movie(db, movie_id), detail=True)


@router.delete("/{movie_id}", status_code=204, dependencies=[WriteAccess])
async def remove_movie(movie_id: str, db: DB) -> Response:
    await begin_write(db)
    if not await delete_movie(db, movie_id):
        raise HTTPException(404, "Filme não encontrado.")
    await db.commit()
    return Response(status_code=204)


@router.get("/{movie_id}/reviews")
async def reviews(
    movie_id: str,
    db: DB,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> dict:
    if not await db.get(DimMovie, movie_id):
        raise HTTPException(404, "Filme não encontrado.")
    statement = select(MovieReview).where(MovieReview.sk_movie_id == movie_id)
    total = await db.scalar(select(func.count()).select_from(statement.subquery()))
    items = (
        await db.scalars(
            statement.order_by(MovieReview.created_at.desc(), MovieReview.sk_movie_review_id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return {
        "items": [ReviewOutput.model_validate(r).model_dump() for r in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size),
    }


@router.post(
    "/{movie_id}/reviews",
    status_code=201,
    response_model=ReviewOutput,
    dependencies=[WriteAccess],
)
async def add_review(movie_id: str, data: ReviewInput, db: DB) -> MovieReview:
    await begin_write(db)
    if not await db.get(DimMovie, movie_id):
        raise HTTPException(404, "Filme não encontrado.")
    review = MovieReview(sk_movie_id=movie_id, **data.model_dump())
    db.add(review)
    await db.flush()
    await refresh_summary(db, movie_id)
    await db.commit()
    await db.refresh(review)
    return review
