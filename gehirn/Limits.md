# Limits

> **Steckbrief**
> - Thema: Verbrauch des Claude-Kontingents im Blick behalten
> - Stand: 2026-11-10
> - Verwandt: [[Cockpit]], [[Agenten]]

- Die Statuszeile von Claude Code (`agentic-os/statuszeile.mjs`) schreibt bei jedem Aufruf zwei Werte mit Uhrzeit in `agentic-os/daten/limits.jsonl`.
- Sitzung: Verbrauch im 5-Stunden-Fenster. Woche: Verbrauch im 7-Tage-Fenster. Beides in Prozent.
- Das [[Cockpit]] zeigt auf der Seite Limits den letzten Wert und den Verlauf. Ab 80 Prozent wird die Anzeige gelb.
- Die Werte gibt es nur mit Claude-Abo und erst nach der ersten Antwort einer Sitzung.
- Einrichten oder entfernen: `node agentic-os/statuszeile-einrichten.mjs` bzw. mit `aus`.
