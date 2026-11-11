# Agenten

> **Steckbrief**
> - Thema: Die drei Agenten, die das Cockpit starten kann
> - Stand: 2026-11-10
> - Verwandt: [[Cockpit]], [[Gehirn]], [[Limits]], [[Sicherheit]]

- Claude Code: wird mit `claude -p "Aufgabe"` gestartet (ohne Fenster). Liest seine Regeln aus `CLAUDE.md`.
- Codex: wird mit `codex exec "Aufgabe"` gestartet (ohne Fenster). Liest seine Regeln aus `AGENTS.md`.
- Hermes: läuft über seinen eigenen API-Server (Standard: 127.0.0.1, Port 8642, gestartet mit `hermes gateway`). Das Cockpit schickt Aufgaben an `POST /v1/runs`. Liest seine Regeln ebenfalls aus `AGENTS.md`.
- Was Hermes ist: ein freier KI-Agent von Nous Research, vergleichbar mit Claude Code. Er hat Werkzeuge (Terminal, Dateien, Websuche, Gedächtnis), braucht aber einen eigenen KI-Anbieter (z. B. Nous-Portal-Abo oder ein anderer Anbieter mit eigenem Schlüssel). Stand 2026-11-11: auf dem Mac nicht installiert, deshalb zeigt seine Spalte nur einen Hinweis. Er ist optional.
- Eine Aufgabe startet nur durch Klick auf Start im [[Cockpit]]. Höchstens drei laufen gleichzeitig, nach 30 Minuten wird abgebrochen.
- Für alle gilt dieselbe Regel: vor jeder Aufgabe im [[Gehirn]] nachlesen, danach Neues dort festhalten.
