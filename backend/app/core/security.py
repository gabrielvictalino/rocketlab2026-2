"""Single administrator authentication; passwords are PBKDF2 hashes, never plaintext."""

import base64
import binascii
import hashlib
import hmac
import json
import secrets
import time
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 600_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, iterations, salt, expected = encoded.split("$")
        if scheme != "pbkdf2_sha256" or not 100_000 <= int(iterations) <= 2_000_000:
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), int(iterations)
        ).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def require_config(settings: Settings) -> None:
    if len(settings.auth_secret.get_secret_value()) < 32 or not (
        settings.admin_password_hash.get_secret_value()
    ):
        raise HTTPException(503, "Configure AUTH_SECRET e ADMIN_PASSWORD_HASH no backend.")


def issue_token(settings: Settings) -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps(
            {
                "sub": settings.admin_username,
                "exp": int(time.time()) + settings.auth_token_ttl_seconds,
                "nonce": secrets.token_hex(16),
            }
        ).encode()
    ).decode()
    signature = hmac.new(
        settings.auth_secret.get_secret_value().encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return f"{payload}.{signature}"


def require_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    require_config(settings)
    try:
        if credentials is None:
            raise ValueError
        payload, signature = credentials.credentials.split(".")
        expected = hmac.new(
            settings.auth_secret.get_secret_value().encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise ValueError
        data = json.loads(base64.urlsafe_b64decode(payload))
        if data["sub"] != settings.admin_username or data["exp"] <= time.time():
            raise ValueError
    except (ValueError, KeyError, TypeError, binascii.Error):
        raise HTTPException(
            401,
            "Sessão inválida ou expirada. Entre novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    return settings.admin_username
