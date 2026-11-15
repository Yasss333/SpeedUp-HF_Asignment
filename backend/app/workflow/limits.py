from time import monotonic

from fastapi import HTTPException

_windows: dict[tuple[str, str], list[float]] = {}


def check_limit(bucket: str, identity: str, maximum: int):
    now = monotonic()
    for key in list(_windows):
        _windows[key] = [stamp for stamp in _windows[key] if stamp > now - 60]
        if not _windows[key]:
            del _windows[key]
    key = (bucket, identity)
    stamps = _windows.setdefault(key, [])
    if len(stamps) >= maximum:
        raise HTTPException(
            429, "Too many requests; retry later", headers={"Retry-After": "60"}
        )
    stamps.append(now)
