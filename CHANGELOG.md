# Changelog

## v1.0.0 - 2026-06-23

### Added
- PWA-Unterstützung mit Manifest, Service Worker und App-Installationsbutton.
- Unterstützung für Unterpfade über `BASE_PATH`, z. B. `/reolink`.
- Dynamische Manifest- und Service-Worker-Auslieferung passend zum konfigurierten Base Path.
- Docker-Compose-Beispiel für Synology/Portainer.
- Dokumentation für Nginx Proxy Manager, Cloudflare Tunnel, PWA und GitHub Release.
- `.env.example`, `.dockerignore`, GitHub-Issue-Templates und Contribution-Hinweise.

### Changed
- Standardpfad für produktiven Betrieb auf `/reolink` gesetzt.
- README für öffentliche GitHub-Veröffentlichung überarbeitet.

### Notes
- Bei Veröffentlichung unter `/reolink` im Nginx Proxy Manager keine Rewrite-Regeln setzen.
