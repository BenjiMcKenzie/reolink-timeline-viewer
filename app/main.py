from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", "/homes/ftp_reolink"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8085"))
APP_NAME = os.getenv("APP_NAME", "Reolink Timeline Viewer")
APP_SHORT_NAME = os.getenv("APP_SHORT_NAME", "Reolink")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
THEME_COLOR = os.getenv("THEME_COLOR", "#050b17")
BACKGROUND_COLOR = os.getenv("BACKGROUND_COLOR", "#050b17")


def normalize_base_path(value: str | None) -> str:
    """Return an URL prefix like '', '/reolink'."""
    if not value:
        return ""
    value = value.strip()
    if value in {"", "/"}:
        return ""
    if not value.startswith("/"):
        value = f"/{value}"
    return value.rstrip("/")


BASE_PATH = normalize_base_path(os.getenv("BASE_PATH", "/reolink"))
STATIC_PREFIX = f"{BASE_PATH}/static" if BASE_PATH else "/static"

FILE_PATTERN = re.compile(
    r"^(?P<camera>.+?)_(?P<timestamp>\d{14})\.(?P<ext>jpg|jpeg|mp4)$",
    re.IGNORECASE,
)
DATE_DIR_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@dataclass
class Event:
    id: str
    camera: str
    timestamp: str
    datetime_iso: str
    date: str
    time: str
    seconds_of_day: int
    image_rel: str | None = None
    video_rel: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


app = FastAPI(title=APP_NAME, version=APP_VERSION)
app.mount(STATIC_PREFIX, StaticFiles(directory="app/static"), name="static")
# Fallback for local testing when BASE_PATH is set.
if STATIC_PREFIX != "/static":
    app.mount("/static", StaticFiles(directory="app/static"), name="static-root")

templates = Jinja2Templates(directory="app/templates")
router = APIRouter(prefix=BASE_PATH)


def app_url(path: str = "") -> str:
    if not path:
        return f"{BASE_PATH}/" if BASE_PATH else "/"
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{BASE_PATH}{path}" if BASE_PATH else path


def safe_relative_path(path: Path) -> str:
    return str(path.relative_to(MEDIA_ROOT)).replace("\\", "/")


def parse_event_file(path: Path) -> tuple[str, datetime, str] | None:
    match = FILE_PATTERN.match(path.name)
    if not match:
        return None

    try:
        timestamp = datetime.strptime(match.group("timestamp"), "%Y%m%d%H%M%S")
    except ValueError:
        return None

    camera = match.group("camera")
    ext = match.group("ext").lower()
    return camera, timestamp, ext


def discover_date_dirs() -> list[Path]:
    if not MEDIA_ROOT.exists():
        return []

    date_dirs: list[Path] = []
    for path in MEDIA_ROOT.rglob("*"):
        if path.is_dir() and DATE_DIR_PATTERN.match(path.name):
            date_dirs.append(path)
    return sorted(date_dirs, key=lambda p: p.name, reverse=True)


def build_index() -> dict[str, list[Event]]:
    grouped: dict[str, dict[str, Event]] = {}

    for date_dir in discover_date_dirs():
        date_value = date_dir.name
        grouped.setdefault(date_value, {})

        for file_path in sorted(date_dir.iterdir()):
            if not file_path.is_file():
                continue

            parsed = parse_event_file(file_path)
            if not parsed:
                continue

            camera, ts, ext = parsed
            event_id = f'{camera}_{ts.strftime("%Y%m%d%H%M%S")}'
            if event_id not in grouped[date_value]:
                grouped[date_value][event_id] = Event(
                    id=event_id,
                    camera=camera,
                    timestamp=ts.strftime("%Y%m%d%H%M%S"),
                    datetime_iso=ts.isoformat(),
                    date=ts.strftime("%Y-%m-%d"),
                    time=ts.strftime("%H:%M:%S"),
                    seconds_of_day=ts.hour * 3600 + ts.minute * 60 + ts.second,
                )

            rel = safe_relative_path(file_path)
            if ext in {"jpg", "jpeg"}:
                grouped[date_value][event_id].image_rel = rel
            elif ext == "mp4":
                grouped[date_value][event_id].video_rel = rel

    result: dict[str, list[Event]] = {}
    for date_value, events in grouped.items():
        result[date_value] = sorted(events.values(), key=lambda e: e.datetime_iso)
    return result


@app.get("/")
def root_redirect():
    if BASE_PATH:
        return RedirectResponse(url=app_url(), status_code=307)
    return HTMLResponse("Reolink Timeline Viewer")


@app.get(BASE_PATH)
def base_without_slash() -> RedirectResponse:
    return RedirectResponse(url=app_url(), status_code=307)


@router.get("/", response_class=HTMLResponse)
def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "request": request,
            "app_name": APP_NAME,
            "app_short_name": APP_SHORT_NAME,
            "base_path": BASE_PATH,
            "static_prefix": STATIC_PREFIX,
            "app_version": APP_VERSION,
            "theme_color": THEME_COLOR,
        },
    )


@router.get("/manifest.webmanifest")
def manifest() -> JSONResponse:
    manifest_data = {
        "id": app_url("/"),
        "name": APP_NAME,
        "short_name": APP_SHORT_NAME,
        "start_url": app_url("/?source=pwa"),
        "scope": app_url("/"),
        "display": "standalone",
        "orientation": "any",
        "background_color": BACKGROUND_COLOR,
        "theme_color": THEME_COLOR,
        "description": "Lokaler Playback-Viewer für Reolink FTP-/Home-Hub-Aufnahmen",
        "icons": [
            {
                "src": app_url("/static/icons/icon-192.png"),
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable",
            },
            {
                "src": app_url("/static/icons/icon-512.png"),
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable",
            },
        ],
    }
    return JSONResponse(manifest_data, media_type="application/manifest+json")


@router.get("/service-worker.js")
def service_worker() -> Response:
    base = app_url("/")
    cache_name = f"reolink-timeline-viewer-{APP_VERSION}-{BASE_PATH or 'root'}"
    urls = [
        base,
        app_url(f"/static/styles.css?v={APP_VERSION}"),
        app_url(f"/static/app.js?v={APP_VERSION}"),
        app_url("/manifest.webmanifest"),
        app_url("/static/icons/icon-192.png"),
        app_url("/static/icons/icon-512.png"),
    ]
    js = f'''
const CACHE_NAME = {json.dumps(cache_name)};
const APP_SCOPE = {json.dumps(base)};
const URLS_TO_CACHE = {json.dumps(urls, ensure_ascii=False, indent=2)};

self.addEventListener("install", (event) => {{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
}});

self.addEventListener("activate", (event) => {{
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : undefined))
    ).then(() => self.clients.claim())
  );
}});

self.addEventListener("fetch", (event) => {{
  const requestUrl = new URL(event.request.url);
  if (!requestUrl.pathname.startsWith(APP_SCOPE)) return;
  if (event.request.method !== "GET") return;

  if (requestUrl.pathname.includes("/api/") || requestUrl.pathname.includes("/media/")) {{
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }}

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {{
      return cachedResponse || fetch(event.request).then((response) => {{
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      }});
    }})
  );
}});
'''.strip()
    return Response(js, media_type="application/javascript")


@router.get("/api/dates")
def get_dates() -> dict[str, list[str]]:
    index = build_index()
    return {"dates": sorted(index.keys(), reverse=True)}


@router.get("/api/cameras")
def get_cameras(date: str | None = None) -> dict[str, list[str]]:
    index = build_index()
    events: list[Event] = []
    if date:
        events = index.get(date, [])
    else:
        for item in index.values():
            events.extend(item)

    cameras = sorted({event.camera for event in events})
    return {"cameras": cameras}


@router.get("/api/events")
def get_events(
    date: str = Query(..., description="YYYY-MM-DD"),
    camera: str | None = Query(None, description="Optional camera name filter"),
) -> dict[str, Any]:
    index = build_index()
    if date not in index:
        return {"date": date, "events": [], "count": 0}

    events = index[date]
    if camera:
        events = [event for event in events if event.camera == camera]

    return {
        "date": date,
        "count": len(events),
        "events": [event.to_dict() for event in events],
    }


@router.get("/media/{media_path:path}")
def serve_media(media_path: str) -> FileResponse:
    requested = (MEDIA_ROOT / media_path).resolve()
    media_root_resolved = MEDIA_ROOT.resolve()

    if not str(requested).startswith(str(media_root_resolved)):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not requested.exists() or not requested.is_file():
        raise HTTPException(status_code=404, detail="Media not found")

    return FileResponse(requested)


app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
