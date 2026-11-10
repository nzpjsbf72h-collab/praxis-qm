// Alle Ordner und kleine Helfer, die mehrere Dateien brauchen.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const COCKPIT = path.dirname(fileURLToPath(import.meta.url)) // agentic-os/
export const WURZEL = path.dirname(COCKPIT) // der Projektordner
export const DATEN = path.join(COCKPIT, 'daten') // Laufzeit-Daten (nicht in Git)
export const GEHIRN = path.join(WURZEL, 'gehirn') // die Notizen
export const VORSCHLAEGE = path.join(WURZEL, 'vorschlaege') // Vorschläge des Nachtlaufs

export const AUFGABEN_DATEI = path.join(DATEN, 'aufgaben.json')
export const LIMITS_DATEI = path.join(DATEN, 'limits.jsonl')
export const SCHLUESSEL_DATEI = path.join(DATEN, 'schluessel')
export const NACHT_LOG = path.join(DATEN, 'nachtlauf.log')

// Sucht ein Programm in PATH, ohne eine Shell zu starten. Gibt den vollen Pfad oder null.
export function findeProgramm(name) {
  for (const ordner of (process.env.PATH || '').split(path.delimiter)) {
    if (!ordner) continue
    const voll = path.join(ordner, name)
    try {
      fs.accessSync(voll, fs.constants.X_OK)
      if (fs.statSync(voll).isFile()) return voll
    } catch {
      // hier nicht vorhanden – weitersuchen
    }
  }
  return null
}

// Schreibt eine Datei "am Stück": erst daneben, dann umbenennen. Nur für mich lesbar.
export function schreibeSicher(datei, inhalt) {
  fs.mkdirSync(path.dirname(datei), { recursive: true })
  const vorlaeufig = `${datei}.${process.pid}.tmp`
  fs.writeFileSync(vorlaeufig, inhalt, { mode: 0o600 })
  fs.renameSync(vorlaeufig, datei)
}

// Liest höchstens die letzten maxBytes einer Datei (für Protokolle).
export function leseEnde(datei, maxBytes) {
  try {
    const groesse = fs.statSync(datei).size
    const start = Math.max(0, groesse - maxBytes)
    const puffer = Buffer.alloc(groesse - start)
    const fd = fs.openSync(datei, 'r')
    fs.readSync(fd, puffer, 0, puffer.length, start)
    fs.closeSync(fd)
    return puffer.toString('utf8')
  } catch {
    return ''
  }
}

// Namen für den nächtlichen Zeitplan (launchd auf dem Mac, cron unter Linux).
export const ZEITPLAN_NAME = 'de.agentic-os.nachtlauf'
export const CRON_MARKE = '# agentic-os-nachtlauf'
