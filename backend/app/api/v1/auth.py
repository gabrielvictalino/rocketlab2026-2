import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings, get_settings
from app.core.security import issue_token, require_admin, require_config, verify_password

router = APIRouter()


class LoginInput(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=1024)


@router.post("/login")
async def login(
    data: LoginInput,
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict:
    require_config(settings)
    valid = await run_in_threadpool(
        verify_password, data.password, settings.admin_password_hash.get_secret_value()
    )
    if not valid or not hmac.compare_digest(
        data.username.encode(), settings.admin_username.encode()
    ):
        raise HTTPException(401, "Usuário ou senha incorretos.")
    response.headers["Cache-Control"] = "no-store"
    return {
        "access_token": issue_token(settings),
        "token_type": "bearer",
        "expires_in": settings.auth_token_ttl_seconds,
        "username": settings.admin_username,
    }


@router.get("/me")
async def me(username: Annotated[str, Depends(require_admin)]) -> dict:
    return {"username": username}
