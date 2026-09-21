"""计算依赖清单文件的指纹（SHA-256，仅标准库）。

用法：
    python scripts/deps_hash.py backend/requirements.txt
    python scripts/deps_hash.py frontend/package-lock.json package.json

把多个文件的内容按顺序合并后求 SHA-256，输出小写十六进制字符串。
文件缺失按空内容处理，这样新增/删除清单文件本身也会改变指纹。
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

# 固定分隔符，避免不同文件内容拼接产生歧义（如 ("ab","c") 与 ("a","bc")）。
SEPARATOR = b"\x00--deps-file--\x00"


def hash_paths(paths: list[str]) -> str:
    digest = hashlib.sha256()
    for raw in paths:
        digest.update(SEPARATOR)
        digest.update(raw.replace("\\", "/").encode("utf-8"))
        digest.update(SEPARATOR)
        file_path = Path(raw)
        if file_path.is_file():
            digest.update(file_path.read_bytes())
    return digest.hexdigest()


def main(argv: list[str]) -> int:
    if not argv:
        print("usage: deps_hash.py <file> [<file> ...]", file=sys.stderr)
        return 2
    print(hash_paths(argv))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
