"""Run all required checks from any directory, using the backend virtualenv if available."""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
venv_python = BACKEND / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
python = str(venv_python) if venv_python.exists() else sys.executable
npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")


def run(command, cwd):
    print(f"\n> {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--restricted",
        action="store_true",
        help="Use the native Vite loader and build only the Storybook preview.",
    )
    parser.add_argument(
        "--backend-only", action="store_true", help="Run only backend lint and tests."
    )
    args = parser.parse_args()
    if not args.backend_only and not npm:
        raise SystemExit("npm não encontrado. Instale Node.js 22.18+ ou 24 LTS.")
    try:
        run([python, "-m", "ruff", "check", "app", "tests"], BACKEND)
        # Avoid reusing pytest's shared user directory, which can retain Windows
        # permissions from a different account. Each run owns its temporary DBs.
        with tempfile.TemporaryDirectory(prefix="rocketlab-tests-") as temporary:
            run(
                [python, "-m", "pytest", "-q", "--basetemp", str(Path(temporary) / "pytest")],
                BACKEND,
            )
        if args.backend_only:
            print("\nVerificações do backend passaram.")
            return
        native = ["--", "--configLoader", "native"] if args.restricted else []
        preview = ["--", "--preview-only"] if args.restricted else []
        run([npm, "test", *native], FRONTEND)
        run([npm, "run", "build", *native], FRONTEND)
        run([npm, "run", "build-storybook", *preview], FRONTEND)
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode) from exc
    print("\nTodas as verificações passaram.")
    if args.restricted:
        print("Modo restrito: somente a prévia do Storybook foi compilada, sem o manager.")


if __name__ == "__main__":
    main()
