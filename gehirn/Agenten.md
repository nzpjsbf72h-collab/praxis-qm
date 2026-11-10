# Agenten

> **Steckbrief**
> - Thema: Die drei Agenten, die das Cockpit starten kann
> - Stand: 2026-11-10
> - Verwandt: [[Cockpit]], [[Gehirn]], [[Limits]], [[Sicherheit]]

- Claude Code: wird mit `claude -p "Aufgabe"` gestartet (ohne Fenster). Liest seine Regeln aus `CLAUDE.md`.
- Codex: wird mit `codex exec "Aufgabe"` gestartet (ohne Fenster). Liest seine Regeln aus `AGENTS.md`.
- Hermes: läuft über seinen eigenen API-Server (Standard: 127.0.0.1, Port 8642, gestartet mit `hermes gateway`). Das Cockpit schickt Aufgaben an `POST /v1/runs`. Liest seine Regeln ebenfalls aus `AGENTS.md`.
- Eine Aufgabe startet nur durch Klick auf Start im [[Cockpit]]. Höchstens drei laufen gleichzeitig, nach 30 Minuten wird abgebrochen.
- Für alle gilt dieselbe Regel: vor jeder Aufgabe im [[Gehirn]] nachlesen, danach Neues dort festhalten.
