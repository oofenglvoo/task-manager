"""Print a .env-style file as KEY=VALUE lines for the batch deploy script.

Handles UTF-8 BOM, CRLF/LF, surrounding quotes and whitespace, blank lines and
`#` comments. Kept dependency-free so `start-server.bat` can call plain `python`.
"""

from __future__ import annotations

import sys


def parse(path: str) -> list[tuple[str, str]]:
    with open(path, "r", encoding="utf-8-sig", errors="replace") as handle:
        lines = handle.read().splitlines()

    pairs: list[tuple[str, str]] = []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if key:
            pairs.append((key, value))
    return pairs


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: load_env.py <file>", file=sys.stderr)
        return 2
    try:
        pairs = parse(sys.argv[1])
    except OSError as error:
        print(f"cannot read {sys.argv[1]}: {error}", file=sys.stderr)
        return 1
    for key, value in pairs:
        print(f"{key}={value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
