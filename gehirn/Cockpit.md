# Cockpit

> **Steckbrief**
> - Thema: Das Agentic OS – die lokale Übersichts-App im Ordner `agentic-os/`
> - Stand: 2026-11-10
> - Verwandt: [[Agenten]], [[Gehirn]], [[Nachtlauf]], [[Limits]], [[Sicherheit]]

- Starten: `node agentic-os/server.mjs`, dann die Adresse aus dem Terminal öffnen (sie enthält den Zugangsschlüssel).
- Stoppen: Strg + C im selben Terminal-Fenster. Laufende Aufgaben werden dabei angehalten.
- Seiten: Cockpit (Übersicht), [[Agenten]], [[Gehirn]], Nacht (Vorschläge aus dem [[Nachtlauf]]), [[Limits]].
- Aufbau: ein Node-Server ohne fremde Pakete; die Oberfläche liegt in `agentic-os/public/`.
- Laufzeit-Daten liegen in `agentic-os/daten/` und werden nicht in Git übernommen.
- Details: `agentic-os/README.md`.
- Auf dem Mac liegt das Projekt unter `~/Documents/praxis-qm` (dort mit `git clone` angelegt). Im Terminal zuerst `cd ~/Documents/praxis-qm`, dann starten. Weil der Ordner unter „Dokumente“ liegt, kann macOS beim ersten [[Nachtlauf]] nach einer Erlaubnis fragen.
- Der Zugangsschlüssel gehört nicht in Bildschirmfotos oder Chats. Wurde er gezeigt: Cockpit stoppen, `agentic-os/daten/schluessel` löschen, neu starten.
