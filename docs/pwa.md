# PWA / App installieren

Der Viewer liefert Manifest und Service Worker dynamisch passend zum `BASE_PATH` aus.

Bei `BASE_PATH=/reolink` gelten:

```text
/reolink/manifest.webmanifest
/reolink/service-worker.js
```

## Checkliste

1. Die Seite muss per HTTPS erreichbar sein.
2. Die URL muss mit Slash geöffnet werden:

```text
https://apps.example.de/reolink/
```

3. Manifest muss erreichbar sein:

```text
https://apps.example.de/reolink/manifest.webmanifest
```

4. Service Worker muss erreichbar sein:

```text
https://apps.example.de/reolink/service-worker.js
```

5. In Chrome/Edge/Vanadium prüfen:

```text
DevTools → Application → Manifest
DevTools → Application → Service Workers
```

## Android / Vanadium

Wenn kein Installieren-Button erscheint:

- Browserdaten für die Domain löschen
- alte installierte App entfernen
- Seite nach OTP neu laden
- URL mit abschließendem Slash öffnen
- Menü öffnen und nach **App installieren** oder **Zum Startbildschirm hinzufügen** schauen

## Wichtig bei Updates

`APP_VERSION` erhöhen, damit Cache und Service Worker neue Dateien sauber übernehmen.
