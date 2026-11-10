# Agentic OS

Eine kleine Übersichts-App für deine Agenten. Sie läuft nur auf deinem eigenen
Rechner und ist aus dem Netz nicht erreichbar.

## Starten

Voraussetzung: Node.js ist installiert (Version 20 oder neuer – brauchst du für
dieses Projekt ohnehin). Es muss **nichts** zusätzlich installiert werden, auch
kein `npm install`.

Im Projektordner im Terminal:

```
node agentic-os/server.mjs
```

Dann im Browser öffnen: **http://127.0.0.1:4747**

Das Terminal-Fenster muss offen bleiben, solange du die App nutzt.

## Stoppen

Im selben Terminal-Fenster **Strg + C** drücken (auf dem Mac: **Control + C**).
Die App ist dann sofort aus; in der Seitenleiste steht „Server gestoppt“.

## Was die vier Punkte zeigen

| Punkt   | Inhalt                                             | Datei                   |
| ------- | -------------------------------------------------- | ----------------------- |
| Cockpit | Kacheln: was läuft gerade, was ist zuletzt passiert | (fasst alles zusammen)  |
| Agenten | alle Agenten mit Zustand                           | `daten/agenten.json`    |
| Gehirn  | Notizen und Wissen                                 | `daten/gehirn/*.md`     |
| Nacht   | Aufgaben für die Nacht                             | `daten/nacht.json`      |

Die Liste „Zuletzt passiert“ kommt aus `daten/ereignisse.json`.

**Wichtig:** Die App ist eine reine Anzeige. Sie zeigt, was in den Dateien im
Ordner `daten/` steht, und liest sie alle 5 Sekunden neu. Sie startet oder
steuert selbst keine Agenten. Die mitgelieferten Einträge sind **Beispiele**
(„Beispiel-Agent …“) – ersetze sie durch deine echten oder lass deine Agenten
in diese Dateien schreiben.

Erlaubte Werte für `status` bei Agenten: `läuft`, `wartet`, `fehler`, `gestoppt`.

Hat eine Datei einen Tippfehler, zeigt die App oben einen roten Hinweis mit dem
Dateinamen, statt abzustürzen.

## Aufbau

```
agentic-os/
  server.mjs        der Server (eine Datei, nur Node-Bordmittel)
  public/           die Oberfläche
    index.html        Gerüst mit Seitenleiste
    style.css         Aussehen
    app.js            holt die Daten und zeichnet die Kacheln
  daten/            deine Inhalte (hier änderst du etwas)
    agenten.json
    ereignisse.json
    nacht.json
    gehirn/           eine .md-Datei pro Notiz
```

## Sicherheit

- Der Server lauscht fest auf `127.0.0.1`. Andere Geräte im WLAN oder im
  Internet kommen nicht heran.
- Nur Lesen: Die App kann über den Browser nichts ändern, löschen oder ausführen.
- Es werden nur fest eingetragene Dateien ausgeliefert, keine frei wählbaren Pfade.
- Aufrufe unter fremdem Namen (Host-Kopfzeile) werden abgelehnt.
- Keine fremden Pakete, keine Verbindungen nach außen, keine Schriften oder
  Skripte aus dem Internet.
- Es gibt keine Anmeldung. Wer an deinem Rechner unter deinem Benutzer arbeitet,
  kann die Seite sehen. Lege deshalb **keine Passwörter oder Patientendaten** in
  `daten/` ab – der Ordner wird außerdem mit ins Git-Repository übernommen.

## Anderer Port

Falls 4747 schon belegt ist:

```
AGENTIC_OS_PORT=4848 node agentic-os/server.mjs
```

Die Adresse ist dann http://127.0.0.1:4848.
