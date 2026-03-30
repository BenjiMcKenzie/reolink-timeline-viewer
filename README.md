# Reolink Timeline Viewer

Ein lokaler Timeline-Viewer für Reolink Home Hub / FTP-Aufnahmen mit Tagesauswahl, Kamera-Filter, Timeline-Markern, Thumbnail-Leiste und großem Viewer für Foto/Video.

## Ziel

Dieses Projekt ist für Reolink-Dateistrukturen gedacht, bei denen Bild und Video denselben Zeitstempel im Dateinamen teilen, zum Beispiel:

- `Haustuer_01_homehub_20260328171736.jpg`
- `Haustuer_01_homehub_20260328171736.mp4`

Die Anwendung fasst diese Dateien zu einem Ereignis zusammen.

## Unterstützte Struktur

Beispiel:

```text
/homes/ftp_reolink/
├── 2026/
├── 2026-03-24/
├── 2026-03-25/
├── 2026-03-26/
└── 2026-03-28/
    ├── Haustuer_01_homehub_20260328171736.jpg
    ├── Haustuer_01_homehub_20260328171736.mp4
    ├── Haustuer_01_homehub_20260328171819.mp4
    └── ...
```

Die Tagesordner werden rekursiv gesucht. Ordner mit Namen im Format `YYYY-MM-DD` werden als Event-Ordner behandelt.

## Funktionen im aktuellen MVP

- lokale Weboberfläche
- Datum auswählbar
- mehrere Kameras unterstützt
- Ereignisse anhand des Dateinamens gruppiert
- JPG zuerst im Hauptviewer
- Umschaltung auf MP4
- Timeline mit Positionsmarkern über 24 Stunden
- Thumbnail-Leiste mit Ereigniskarten
- Docker-ready

## Tech Stack

- FastAPI
- Jinja2
- Vanilla JavaScript
- Docker / Docker Compose

## Lokal starten ohne Docker

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export MEDIA_ROOT=/homes/ftp_reolink
uvicorn app.main:app --host 0.0.0.0 --port 8085 --reload
```

Dann im Browser öffnen:

```text
http://<deine-synology-ip>:8085
```

## Start mit Docker Compose

```bash
docker compose up -d --build
```

Oder in Portainer als Stack mit dem Inhalt von `docker-compose.yml`.

## Wichtige Hinweise

### 1. Volume-Mount

Die App sieht nur Dateien, die in den Container gemountet werden.

Aktuell ist das vorbereitet für:

```yaml
volumes:
  - /homes/ftp_reolink:/homes/ftp_reolink:ro
```

### 2. Nur lokale Nutzung

Das Projekt ist derzeit für lokale Nutzung gedacht. Es gibt aktuell:

- keine Benutzerverwaltung
- keinen Login
- keine externen Freigaben
- keine Schreibzugriffe

### 3. Dateinamensmuster

Erwartet wird aktuell:

```text
<KAMERANAME>_YYYYMMDDHHMMSS.jpg
<KAMERANAME>_YYYYMMDDHHMMSS.mp4
```

Beispiel:

```text
Haustuer_01_homehub_20260328171736.jpg
```

## Roadmap

- Caching / schnelleres Indexing
- Autorefresh für neue Dateien
- Mehrfachauswahl mehrerer Tage
- Scrubbing / Sprung entlang der Timeline
- Video-Vorschaubild aus MP4 generieren, wenn kein JPG existiert
- Ereignistypen farblich markieren
- Home-Assistant-Integration
- Container-Image auf GitHub Container Registry

## GitHub-Veröffentlichung

Empfohlener Repo-Name:

```text
reolink-timeline-viewer
```

Erste sinnvolle Tags / Topics:

```text
reolink fastapi docker synology timeline cctv nvr homehub
```
