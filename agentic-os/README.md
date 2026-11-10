# Agentic OS – das Cockpit

Eine kleine App, die nur auf deinem eigenen Rechner läuft. Sie startet deine
Agenten, zeigt dein Wissen („Gehirn“) als Netz, legt dir morgens die Vorschläge
aus dem Nachtlauf vor und zeigt deinen Claude-Verbrauch.

## Starten

Voraussetzung: Node.js (Version 20 oder neuer). Es muss **nichts** zusätzlich
installiert werden, auch kein `npm install`.

Im Projektordner im Terminal:

```
node agentic-os/server.mjs
```

Im Terminal erscheint dann die Adresse, zum Beispiel:

```
Adresse:  http://127.0.0.1:4747/?schluessel=…
```

Öffne **genau diese Adresse** im Browser. Der Schlüssel am Ende ist dein
Zugang; der Browser merkt ihn sich, danach reicht http://127.0.0.1:4747.
Der Schlüssel bleibt bei jedem Start gleich (er liegt in `agentic-os/daten/schluessel`).

## Stoppen

Im selben Terminal-Fenster **Strg + C** drücken (auf dem Mac: **Control + C**).
Das Cockpit ist dann sofort aus und hält auch alle Aufgaben an, die es gestartet hat.

## Die Seiten

| Seite   | Was sie zeigt |
| ------- | ------------- |
| Cockpit | Kacheln: laufende Aufgaben, offene Vorschläge, Notizen, Limits – und was zuletzt passiert ist |
| Agenten | Drei Spalten: Claude Code, Codex, Hermes. Aufgabe eintippen, **Start** klicken |
| Gehirn  | Alle Notizen aus `gehirn/` als Netz: jede Notiz ein Punkt, jeder Verweis eine Linie |
| Nacht   | Vorschläge aus dem Nachtlauf als Karten mit **Übernehmen** und **Verwerfen** |
| Limits  | Zwei Anzeigen, Sitzung und Woche, mit letztem Wert und Verlauf; ab 80 % gelb |

## Agenten

- **Claude Code** wird mit `claude -p "Aufgabe"` gestartet, **Codex** mit
  `codex exec "Aufgabe"` – jeweils im Projektordner.
- **Hermes** läuft über seinen eigenen API-Server. Dafür in `~/.hermes/.env`
  eintragen: `API_SERVER_ENABLED=true` und `API_SERVER_KEY=<ein eigener, langer Schlüssel>`,
  dann `hermes gateway` starten. Das Cockpit liest den Schlüssel aus dieser Datei
  und spricht nur mit `127.0.0.1` (Port 8642, oder `API_SERVER_PORT`).
- Ist ein Agent nicht installiert, steht in seiner Spalte nur ein Hinweis.
- Eine Aufgabe startet **erst beim Klick auf Start**. Die Eingabetaste startet nichts.
- Höchstens 3 Aufgaben laufen gleichzeitig; nach 30 Minuten wird eine Aufgabe abgebrochen.
  Mit **Stoppen** hältst du eine laufende Aufgabe an.
- Die Agenten laufen mit ihren normalen Schutz-Einstellungen. Das Cockpit setzt
  keine Schalter, die Rückfragen überspringen. Braucht ein Agent eine Erlaubnis,
  die er ohne Fenster nicht einholen kann, lässt er den Schritt aus und schreibt das in die Ausgabe.

## Gehirn

Die Notizen liegen im Ordner `gehirn/` (eine Ebene über diesem Ordner):
eine Datei je Thema, oben ein Steckbrief, Verweise als `[[Name]]`.
Wie eine Notiz aussieht, steht in `gehirn/Gehirn.md`.

Die Regel „vorher nachlesen, nachher festhalten, nie Passwörter oder Schlüssel“
steht gleichlautend in `CLAUDE.md` (liest Claude Code) und `AGENTS.md` (lesen
Codex und Hermes). Hermes lädt laut seiner Doku nur **eine** Projektdatei, in
dieser Reihenfolge: `.hermes.md`, `AGENTS.override.md`, `AGENTS.md`, `CLAUDE.md`.
Lege deshalb keine `.hermes.md` an, sonst liest Hermes die Regel nicht mehr.

## Nachtlauf

`nachtlauf.mjs` ruft einmal `claude -p` auf. Der Aufruf bekommt die Gespräche
der letzten 24 Stunden (Claude-Code-Gespräche dieses Projekts und die Aufgaben
aus dem Cockpit) sowie alle Notizen und antwortet mit Vorschlägen. Claude läuft
dabei ganz ohne Werkzeuge und kann deshalb selbst nichts verändern. Die
Vorschläge landen in `vorschlaege/`. **Erst dein Klick auf Übernehmen ändert `gehirn/`.**
Entschiedene Vorschläge wandern nach `vorschlaege/erledigt/`.

```
node agentic-os/nachtlauf.mjs          einmal von Hand ausprobieren
node agentic-os/zeitplan.mjs an        jede Nacht um 3:00 Uhr einschalten
node agentic-os/zeitplan.mjs aus       wieder abschalten
node agentic-os/zeitplan.mjs status    nachsehen
```

- **Mac:** `an` legt die Datei `~/Library/LaunchAgents/de.agentic-os.nachtlauf.plist`
  an und meldet sie bei launchd an; `aus` meldet sie ab und löscht sie.
  Schläft der Mac um 3 Uhr, holt launchd den Lauf beim Aufwachen nach.
  Liegt das Projekt in „Dokumente“ oder auf dem Schreibtisch, kann macOS beim
  ersten Lauf nach einer Zugriffs-Erlaubnis fragen.
- **Linux:** `an` fügt deiner crontab eine Zeile mit der Marke
  `# agentic-os-nachtlauf` hinzu; `aus` entfernt genau diese Zeile wieder.
- Der Nachtlauf verbraucht etwas von deinem Claude-Kontingent.
- Was er getan hat, steht auf der Seite Nacht unter „Protokoll“.

## Limits (Statuszeile)

`statuszeile.mjs` ist eine Statuszeile für Claude Code. Bei jedem Aufruf
schreibt sie `rate_limits.five_hour.used_percentage` (Sitzung) und
`rate_limits.seven_day.used_percentage` (Woche) mit Uhrzeit als eine Zeile in
`agentic-os/daten/limits.jsonl` und zeigt beide Werte unten in Claude Code an.

```
node agentic-os/statuszeile-einrichten.mjs        zeigt die Änderung, fragt, trägt ein
node agentic-os/statuszeile-einrichten.mjs aus    entfernt den Eintrag wieder
```

Das Skript ändert nur den Eintrag `statusLine` in `~/.claude/settings.json`,
zeigt vorher „Bisher“ und „Neu“, fragt nach und legt eine Sicherungskopie an.
Die Werte gibt es nur mit Claude-Abo (Pro, Max) und erst nach der ersten Antwort
einer Sitzung.

## Aufbau

```
agentic-os/
  server.mjs                  der Server: Zugang, Adressen, Antworten
  agenten.mjs                 Aufgaben starten, verfolgen, stoppen
  gehirn.mjs                  Notizen und Vorschläge lesen, prüfen, übernehmen
  pfade.mjs                   Ordner und kleine Helfer
  nachtlauf.mjs               der nächtliche Lauf
  zeitplan.mjs                Zeitplan an/aus (launchd oder cron)
  statuszeile.mjs             Statuszeile für Claude Code
  statuszeile-einrichten.mjs  trägt die Statuszeile ein oder aus
  public/                     die Oberfläche (index.html, style.css, app.js)
  daten/                      Laufzeit-Daten, bleiben auf dem Rechner (nicht in Git)
gehirn/                       deine Notizen (in Git)
vorschlaege/                  Vorschläge des Nachtlaufs (nicht in Git)
CLAUDE.md, AGENTS.md          die Regel für die Agenten
```

## Sicherheit

- Der Server lauscht fest auf `127.0.0.1`. Andere Geräte im WLAN oder im
  Internet kommen nicht heran.
- Ohne den Schlüssel aus der Start-Adresse gibt es keinen Zugang – auch nicht
  für andere Programme oder Benutzer auf demselben Rechner. Gib die Adresse mit
  Schlüssel nicht weiter. Neuer Schlüssel: Cockpit stoppen, `agentic-os/daten/schluessel`
  löschen, neu starten.
- Starten, Stoppen, Übernehmen und Verwerfen nimmt der Server nur vom Cockpit
  selbst an; fremde Webseiten werden abgelehnt.
- Agenten werden ohne Shell gestartet. Die Aufgabe ist reiner Text und kann
  keine zusätzlichen Befehle oder Schalter einschleusen.
- Vorschläge dürfen nur `.md`-Dateien direkt in `gehirn/` betreffen. Wurde eine
  Notiz seit dem Vorschlag geändert, ist Übernehmen gesperrt. Vorschläge, die
  nach Passwort oder Schlüssel aussehen, werden abgelehnt.
- Keine fremden Pakete, keine Schriften oder Skripte aus dem Internet.
- Lege **keine Passwörter oder Patientendaten** in `gehirn/` ab – der Ordner
  wird ins Git-Repository übernommen.
- Bedenke: Ausgaben der Agenten und Gespräche gehen beim Nachtlauf an Claude
  (Anthropic), so wie bei jeder normalen Claude-Code-Sitzung.

## Anderer Port

Falls 4747 schon belegt ist: `AGENTIC_OS_PORT=4848 node agentic-os/server.mjs`
