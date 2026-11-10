# Sicherheit

> **Steckbrief**
> - Thema: Sicherheitsregeln für dieses Projekt – Sicherheit hat oberste Priorität
> - Stand: 2026-11-10
> - Verwandt: [[Cockpit]], [[Gehirn]], [[Agenten]], [[Praxis Portal]], [[Azure-Deployment]]

- Nie Passwörter, Schlüssel, Tokens oder Patientendaten in Notizen, Code oder Git ablegen.
- Vor jeder Installation erst fragen.
- Das [[Cockpit]] lauscht nur auf 127.0.0.1 und verlangt den Zugangsschlüssel aus der Start-Adresse.
- Agenten werden ohne Schalter gestartet, die Rückfragen oder Schutzmechanismen umgehen (siehe [[Agenten]]).
- Der [[Nachtlauf]] läuft ohne Werkzeuge und kann deshalb selbst nichts verändern.
- Änderungen an Einstellungen des Rechners werden vorher gezeigt.
