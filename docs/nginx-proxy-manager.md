# Nginx Proxy Manager

Ziel:

```text
https://apps.example.de/reolink/
```

leitet auf den Viewer weiter:

```text
http://<SYNOLOGY-IP>:8085/reolink/
```

## Voraussetzung

Im Container muss gesetzt sein:

```env
BASE_PATH=/reolink
```

## Proxy Host

Lege in Nginx Proxy Manager einen Proxy Host für die Hauptdomain an:

```text
Domain Names: apps.example.de
Scheme: http
Forward Hostname / IP: <SYNOLOGY-IP>
Forward Port: 80
```

Wenn die Hauptdomain bereits auf eine Web Station zeigt, bleibt diese Konfiguration bestehen.

## Custom Location für den Viewer

Im Proxy Host unter **Custom Locations**:

```text
Location: /reolink
Scheme: http
Forward Hostname / IP: <SYNOLOGY-IP>
Forward Port: 8085
```

Wichtig: **Keine Rewrite-Regeln setzen.**

Der Viewer kennt `/reolink` selbst. Ein Rewrite würde den Pfad entfernen und PWA, Manifest oder API-Routen beschädigen.

## Test-URLs

```text
https://apps.example.de/reolink/
https://apps.example.de/reolink/manifest.webmanifest
https://apps.example.de/reolink/service-worker.js
https://apps.example.de/reolink/api/dates
```

Alle vier URLs müssen erreichbar sein.
