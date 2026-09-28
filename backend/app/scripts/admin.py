"""Print settings for the single administrator without persisting the password."""

import getpass
import secrets

from app.core.security import hash_password


def main() -> None:
    password = getpass.getpass("Senha do administrador (mínimo 12 caracteres): ")
    if len(password) < 12:
        raise SystemExit("Use pelo menos 12 caracteres.")
    if password != getpass.getpass("Confirme a senha: "):
        raise SystemExit("As senhas não conferem.")
    print(f"ADMIN_PASSWORD_HASH='{hash_password(password)}'")
    print(f"AUTH_SECRET='{secrets.token_urlsafe(48)}'")


if __name__ == "__main__":
    main()
