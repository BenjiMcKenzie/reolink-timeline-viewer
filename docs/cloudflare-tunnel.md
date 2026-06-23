# Cloudflare Tunnel

Empfohlener Aufbau:

```text
Cloudflare Tunnel
  → http://<SYNOLOGY-IP>:19080
  → Nginx Proxy Manager
  → Custom Location /reolink
  → http://<SYNOLOGY-IP>:8085/reolink/
```

## Public Hostname

Im Cloudflare Tunnel:

```text
Subdomain: apps
Domain: example.de
Service Type: HTTP
URL: http://<SYNOLOGY-IP>:19080
```

`19080` ist nur ein Beispiel. Verwende den extern gemappten HTTP-Port deines Nginx Proxy Manager Containers.

## Cloudflare Access / OTP

Für OTP kann eine Access Application auf die komplette App oder nur auf den Pfad gelegt werden:

```text
apps.example.de/reolink/*
```

Wenn die PWA installiert werden soll, nach dem OTP die Seite einmal vollständig neu laden.
