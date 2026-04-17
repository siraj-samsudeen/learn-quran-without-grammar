"""End-to-end: run CLI then validator, assert all pass."""
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_full_build_and_validate(tmp_path: Path) -> None:
    db = tmp_path / "quran.db"
    build = subprocess.run(
        [sys.executable, str(REPO_ROOT / "tools" / "build-quran-db.py"),
         "--all", "--db", str(db)],
        capture_output=True, text=True, timeout=600,
    )
    assert build.returncode == 0, build.stderr

    validate = subprocess.run(
        [sys.executable, str(REPO_ROOT / "tools" / "validate-quran-db.py"),
         "--db", str(db)],
        capture_output=True, text=True,
    )
    assert validate.returncode == 0, validate.stdout + validate.stderr
    assert "ALL PASS" in validate.stdout
