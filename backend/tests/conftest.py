import asyncio

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings, get_settings
from app.core.security import hash_password
from app.db.session import enable_sqlite_foreign_keys, get_db
from app.main import create_app


@pytest.fixture(scope="session")
def password_hash():
    return hash_password("test-password-2026")


@pytest.fixture
def database(tmp_path, monkeypatch, password_hash):
    path = tmp_path / "test.db"
    url = f"sqlite+aiosqlite:///{path.as_posix()}"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    command.upgrade(Config("alembic.ini"), "head")
    engine = create_async_engine(url, poolclass=NullPool)
    enable_sqlite_foreign_keys(engine)
    factory = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
    settings = Settings(
        _env_file=None,
        database_url=url,
        environment="test",
        admin_username="admin",
        admin_password_hash=password_hash,
        auth_secret="test-only-secret-with-more-than-32-characters",
    )
    yield path, factory, settings
    asyncio.run(engine.dispose())
    get_settings.cache_clear()


@pytest.fixture
def client(database):
    _, factory, settings = database
    application = create_app()

    async def override_db():
        async with factory() as session:
            yield session

    application.dependency_overrides[get_db] = override_db
    application.dependency_overrides[get_settings] = lambda: settings
    with TestClient(application) as test_client:
        yield test_client


@pytest.fixture
def auth(client):
    response = client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": "test-password-2026"}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def movie_input():
    return {
        "titulo": "Horizonte",
        "ano_lancamento": 2026,
        "diretores": ["Marina Costa"],
        "generos": ["Drama"],
        "produtoras": ["Estúdio Norte"],
        "sinopse": "Uma viagem de volta para casa.",
        "pessoas": [{"nome_pessoa": "Ana Silva", "tipo_pessoa": "Ator"}],
    }
