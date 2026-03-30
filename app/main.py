from __future__ import annotations

import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request

MEDIA_ROOT = Path(os.getenv('MEDIA_ROOT', '/homes/ftp_reolink'))
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', '8085'))

FILE_PATTERN = re.compile(
    r'^(?P<camera>.+?)_(?P<timestamp>\d{14})\.(?P<ext>jpg|jpeg|mp4)$',
    re.IGNORECASE,
)
DATE_DIR_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')


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


app = FastAPI(title='Reolink Timeline Viewer', version='0.1.0')
app.mount('/static', StaticFiles(directory='app/static'), name='static')
templates = Jinja2Templates(directory='app/templates')


def safe_relative_path(path: Path) -> str:
    return str(path.relative_to(MEDIA_ROOT)).replace('\\', '/')


def parse_event_file(path: Path) -> tuple[str, datetime, str] | None:
    match = FILE_PATTERN.match(path.name)
    if not match:
        return None

    try:
        timestamp = datetime.strptime(match.group('timestamp'), '%Y%m%d%H%M%S')
    except ValueError:
        return None

    camera = match.group('camera')
    ext = match.group('ext').lower()
    return camera, timestamp, ext


def discover_date_dirs() -> list[Path]:
    if not MEDIA_ROOT.exists():
        return []

    date_dirs: list[Path] = []
    for path in MEDIA_ROOT.rglob('*'):
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
                    timestamp=ts.strftime('%Y%m%d%H%M%S'),
                    datetime_iso=ts.isoformat(),
                    date=ts.strftime('%Y-%m-%d'),
                    time=ts.strftime('%H:%M:%S'),
                    seconds_of_day=ts.hour * 3600 + ts.minute * 60 + ts.second,
                )

            rel = safe_relative_path(file_path)
            if ext in {'jpg', 'jpeg'}:
                grouped[date_value][event_id].image_rel = rel
            elif ext == 'mp4':
                grouped[date_value][event_id].video_rel = rel

    result: dict[str, list[Event]] = {}
    for date_value, events in grouped.items():
        result[date_value] = sorted(
            events.values(),
            key=lambda e: e.datetime_iso,
        )
    return result


@app.get('/', response_class=HTMLResponse)
def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "index.html", {"request": request})


@app.get('/api/dates')
def get_dates() -> dict[str, list[str]]:
    index = build_index()
    return {'dates': sorted(index.keys(), reverse=True)}


@app.get('/api/cameras')
def get_cameras(date: str | None = None) -> dict[str, list[str]]:
    index = build_index()
    events: list[Event] = []
    if date:
        events = index.get(date, [])
    else:
        for item in index.values():
            events.extend(item)

    cameras = sorted({event.camera for event in events})
    return {'cameras': cameras}


@app.get('/api/events')
def get_events(
    date: str = Query(..., description='YYYY-MM-DD'),
    camera: str | None = Query(None, description='Optional camera name filter'),
) -> dict[str, Any]:
    index = build_index()
    if date not in index:
        return {'date': date, 'events': [], 'count': 0}

    events = index[date]
    if camera:
        events = [event for event in events if event.camera == camera]

    return {
        'date': date,
        'count': len(events),
        'events': [event.to_dict() for event in events],
    }


@app.get('/media/{media_path:path}')
def serve_media(media_path: str) -> FileResponse:
    requested = (MEDIA_ROOT / media_path).resolve()
    media_root_resolved = MEDIA_ROOT.resolve()

    if not str(requested).startswith(str(media_root_resolved)):
        raise HTTPException(status_code=400, detail='Invalid path')
    if not requested.exists() or not requested.is_file():
        raise HTTPException(status_code=404, detail='Media not found')

    return FileResponse(requested)


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app.main:app', host=HOST, port=PORT, reload=True)
