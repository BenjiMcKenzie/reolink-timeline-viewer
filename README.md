# Reolink Timeline Viewer

Ein schlanker Web-Viewer für Reolink FTP-/Home-Hub-Aufnahmen. Der Viewer liest lokale Bild- und Videodateien aus einem Ordner, gruppiert sie nach Datum, Kamera und Uhrzeit und stellt sie als Timeline dar.

Die Version `1.0.0` ist für den Betrieb hinter einem Reverse Proxy vorbereitet und unterstützt die Veröffentlichung unter einem Unterpfad wie `/reolink`.

## Funktionen

- Timeline-Ansicht für Reolink-Ereignisse
- Foto- und Videomodus
- Kamera-Filter
- Datumsnavigation
- Auto-Auswahl des neuesten Ereignisses beim Öffnen
- PWA-Unterstützung: als App installierbar
- Docker-Deployment
- konfigurierbarer Base Path, z. B. `/reolink`
- vorbereitet für Nginx Proxy Manager und Cloudflare Tunnel

## Erwartete Dateistruktur

Der Viewer sucht nach Dateien in Datumsordnern:

```text
MEDIA_ROOT/
├── 2026-06-21/
│   ├── Haustuer_20260621103015.jpg
│   ├── Haustuer_20260621103015.mp4
│   └── Terrasse_20260621114530.jpg
└── 2026-06-22/
    └── Haustuer_20260622081200.jpg
```

Erwartetes Namensschema:

```text
<Kamera>_<YYYYMMDDHHMMSS>.jpg
<Kamera>_<YYYYMMDDHHMMSS>.mp4
```

## Schnellstart mit Docker Compose

```bash
cp .env.example .env
# .env anpassen
docker compose up -d --build
```

Standardmäßig ist der Viewer danach lokal erreichbar unter:

```text
http://<SYNOLOGY-IP>:8085/reolink/
```

## Konfiguration

Die wichtigsten Einstellungen stehen in `.env` oder im `environment`-Block der `docker-compose.yml`.

| Variable | Standard | Beschreibung |
|---|---:|---|
| `MEDIA_ROOT` | `/data/reolink` | Ordner mit Reolink-Aufnahmen im Container |
| `PORT` | `8085` | interner Webserver-Port |
| `BASE_PATH` | `/reolink` | Unterpfad für Reverse Proxy/PWA |
| `APP_NAME` | `Reolink Timeline Viewer` | voller App-Name |
| `APP_SHORT_NAME` | `Reolink` | kurzer PWA-Name |
| `APP_VERSION` | `1.0.0` | Version und Cache-Busting |
| `THEME_COLOR` | `#050b17` | PWA-/Browser-Farbe |
| `BACKGROUND_COLOR` | `#050b17` | PWA-Hintergrundfarbe |

## Beispiel: Synology / Portainer

In der `docker-compose.yml` muss der lokale Reolink-Ordner auf `/data/reolink` gemappt werden:

```yaml
volumes:
  - /volume1/homes/ftp_reolink:/data/reolink:ro
```

Bei anderer Ablage entsprechend anpassen.

## Betrieb unter `apps.example.de/reolink/`

Der Viewer ist für folgenden Aufbau vorbereitet:

```text
Cloudflare Tunnel
  → Nginx Proxy Manager
  → http://<SYNOLOGY-IP>:8085/reolink/
```

Kurzfassung für Nginx Proxy Manager:

- Proxy Host: `apps.example.de`
- Custom Location: `/reolink`
- Forward Host/IP: `<SYNOLOGY-IP>`
- Forward Port: `8085`
- keine Rewrite-Regeln verwenden

Details stehen in [`docs/nginx-proxy-manager.md`](docs/nginx-proxy-manager.md).

## PWA

Die PWA ist auf den Unterpfad ausgerichtet:

```json
"id": "/reolink/",
"start_url": "/reolink/?source=pwa",
"scope": "/reolink/"
```

Wenn der Installieren-Button auf Android nicht erscheint, siehe [`docs/pwa.md`](docs/pwa.md).

## GitHub Release

Eine kurze Release-Anleitung steht in [`docs/github-release.md`](docs/github-release.md).

## Lizenz

MIT License. Siehe [`LICENSE`](LICENSE).
