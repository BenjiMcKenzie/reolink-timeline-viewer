# Contributing

Danke für dein Interesse am Reolink Timeline Viewer.

## Entwicklung lokal starten

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
BASE_PATH=/reolink MEDIA_ROOT=/path/to/reolink PORT=8085 uvicorn app.main:app --host 0.0.0.0 --port 8085 --reload
```

Danach öffnen:

```text
http://localhost:8085/reolink/
```

## Pull Requests

Bitte beschreibe:

- welches Problem gelöst wird
- wie getestet wurde
- ob Docker, PWA oder Reverse-Proxy-Verhalten betroffen ist
