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
