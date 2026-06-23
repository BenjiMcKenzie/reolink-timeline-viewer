# GitHub Release veröffentlichen

## Änderungen committen

```bash
git add .
git commit -m "Release v1.0.0: PWA and /reolink path support"
git push
```

## Tag erstellen

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Release Notes

Vorschlag:

```text
## Reolink Timeline Viewer v1.0.0

Erstes stabiles Release mit Docker, PWA-Unterstützung und Betrieb unter einem Reverse-Proxy-Unterpfad wie /reolink.

Highlights:
- Timeline für Reolink-Aufnahmen
- Foto-/Videomodus
- PWA installierbar auf Desktop und Android
- BASE_PATH-Unterstützung für Nginx Proxy Manager
- Dokumentation für Cloudflare Tunnel und GitHub Deployment
```
