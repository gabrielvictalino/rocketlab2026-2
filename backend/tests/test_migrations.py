import sqlite3

from alembic import command
from alembic.config import Config


def test_alembic_downgrade_upgrade_and_no_schema_drift(database):
    config = Config("alembic.ini")
    command.downgrade(config, "base")
    with sqlite3.connect(database[0]) as db:
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert "dim_movies" not in tables
    command.upgrade(config, "head")
    command.check(config)
    with sqlite3.connect(database[0]) as db:
        assert db.execute("SELECT version_num FROM alembic_version").fetchone()[0] == (
            "0001_initial_movie_schema"
        )
