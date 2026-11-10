# Nachtlauf

> **Steckbrief**
> - Thema: Der nächtliche Aufräum-Lauf für das Gehirn
> - Stand: 2026-11-10
> - Verwandt: [[Gehirn]], [[Cockpit]], [[Sicherheit]]

- Jede Nacht um 3:00 Uhr startet `agentic-os/nachtlauf.mjs` einen Aufruf von `claude -p`.
- Er liest die Gespräche des Tages und das [[Gehirn]] und schreibt Vorschläge in den Ordner `vorschlaege/`.
- Er ändert das Gehirn nie selbst. Erst ein Klick auf Übernehmen im [[Cockpit]] (Seite Nacht) ändert eine Notiz.
- Arten von Vorschlägen: doppelte Notizen zusammenführen, Veraltetes markieren, neue Verweise, neue Regeln.
- Ein- und ausschalten: `node agentic-os/zeitplan.mjs an` bzw. `aus`.
