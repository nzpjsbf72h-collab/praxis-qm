#!/usr/bin/env node
// Statuszeile für Claude Code.
//
// Claude Code ruft dieses Skript auf und übergibt den Sitzungs-Stand als JSON.
// Das Skript schreibt die beiden Limit-Werte mit Uhrzeit in daten/limits.jsonl
// (eine Zeile je Aufruf) und gibt eine kurze Zeile für die Anzeige aus.
// Es darf nie abstürzen und schickt nichts ins Netz.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATEI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'daten', 'limits.jsonl')
const MAX_GROESSE = 1024 * 1024 // ab 1 MB wird die ältere Hälfte entfernt

function prozent(wert) {
  return typeof wert === 'number' && Number.isFinite(wert) ? Math.round(wert * 10) / 10 : null
}

let eingabe = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (stueck) => (eingabe += stueck))
process.stdin.on('end', () => {
  let sitzung = null
  let woche = null
  try {
    const limits = JSON.parse(eingabe).rate_limits || {}
    sitzung = prozent(limits.five_hour?.used_percentage)
    woche = prozent(limits.seven_day?.used_percentage)
  } catch {
    // keine lesbaren Daten – dann nur die Anzeige unten
  }

  // Die Werte gibt es nur mit Claude-Abo und erst nach der ersten Antwort einer Sitzung.
  if (sitzung !== null || woche !== null) {
    try {
      fs.mkdirSync(path.dirname(DATEI), { recursive: true })
      fs.appendFileSync(DATEI, JSON.stringify({ zeit: new Date().toISOString(), sitzung, woche }) + '\n', {
        mode: 0o600,
      })
      if (fs.statSync(DATEI).size > MAX_GROESSE) {
        const zeilen = fs.readFileSync(DATEI, 'utf8').split('\n')
        fs.writeFileSync(DATEI, zeilen.slice(Math.floor(zeilen.length / 2)).join('\n'))
      }
    } catch {
      // Schreiben fehlgeschlagen – die Statuszeile soll trotzdem erscheinen
    }
  }

  const zeige = (wert) => (wert === null ? '–' : `${Math.round(wert)} %`)
  process.stdout.write(`Sitzung ${zeige(sitzung)} · Woche ${zeige(woche)}\n`)
})
