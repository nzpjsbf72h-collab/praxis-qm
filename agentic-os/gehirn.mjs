// Gehirn: Notizen lesen, Verweise [[Name]] finden, Vorschläge prüfen und übernehmen.
//
// Wichtig: Nur die Funktion "entscheide" ändert den Ordner gehirn/ – und sie wird
// nur durch einen Klick auf "Übernehmen" im Cockpit aufgerufen.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { GEHIRN, VORSCHLAEGE, schreibeSicher } from './pfade.mjs'

const MAX_NOTIZ = 100 * 1024
const NAME_MUSTER = /^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß _-]{0,79}\.md$/
const ID_MUSTER = /^[A-Za-z0-9_-]{1,80}$/
export const ARTEN = ['zusammenfuehren', 'veraltet', 'verweise', 'regel']

// Grobe Erkennung von Passwörtern und Schlüsseln. Lieber einmal zu oft warnen.
const GEHEIM_MUSTER = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\b(passwort|password|kennwort|api[_-]?key|secret|token)\b\s*[:=]\s*\S{6,}/i,
]

export function enthaeltGeheimnis(text) {
  return GEHEIM_MUSTER.some((muster) => muster.test(text))
}

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

// Gibt den Inhalt einer Notiz zurück oder null, wenn es sie nicht gibt.
function leseNotiz(dateiname) {
  const datei = path.join(GEHIRN, dateiname)
  let info
  try {
    info = fs.lstatSync(datei)
  } catch {
    return null
  }
  if (!info.isFile()) throw new Error(`${dateiname} ist keine normale Datei.`)
  if (info.size > MAX_NOTIZ) throw new Error(`${dateiname} ist zu groß.`)
  return fs.readFileSync(datei, 'utf8')
}

export function findeVerweise(text) {
  const namen = new Set()
  for (const treffer of text.matchAll(/\[\[([^\]|#\n]{1,80})(?:[|#][^\]\n]*)?\]\]/g)) {
    namen.add(treffer[1].trim())
  }
  return [...namen]
}

// Der Steckbrief sind die Zitat-Zeilen ("> ...") direkt unter der Überschrift.
function leseSteckbrief(text) {
  const zeilen = []
  for (const zeile of text.split('\n')) {
    if (zeile.startsWith('>')) {
      const inhalt = zeile.replace(/^>\s?/, '').replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim()
      if (inhalt && inhalt !== 'Steckbrief') zeilen.push(inhalt)
    } else if (zeilen.length) {
      break
    }
  }
  return zeilen
}

export function leseGehirn(hinweise = []) {
  let dateien = []
  try {
    dateien = fs.readdirSync(GEHIRN).filter((n) => NAME_MUSTER.test(n)).sort()
  } catch (fehler) {
    hinweise.push(`gehirn/: ${fehler.message}`)
  }
  const notizen = []
  for (const dateiname of dateien.slice(0, 300)) {
    try {
      const text = leseNotiz(dateiname)
      if (text === null) continue
      notizen.push({
        name: dateiname.replace(/\.md$/, ''),
        text,
        steckbrief: leseSteckbrief(text),
        verweise: findeVerweise(text),
      })
    } catch (fehler) {
      hinweise.push(`gehirn/${dateiname}: ${fehler.message}`)
    }
  }
  return notizen
}

// ---------- Vorschläge ----------

// Prüft einen Vorschlag streng. Wirft einen Fehler, wenn etwas nicht stimmt.
export function pruefeVorschlag(v) {
  if (!v || typeof v !== 'object') throw new Error('kein Vorschlag')
  if (!ARTEN.includes(v.art)) throw new Error('unbekannte Art')
  if (typeof v.titel !== 'string' || !v.titel.trim() || v.titel.length > 200) throw new Error('Titel fehlt')
  if (typeof v.begruendung !== 'string' || v.begruendung.length > 4000) throw new Error('Begründung fehlt')
  if (!Array.isArray(v.aenderungen) || v.aenderungen.length < 1 || v.aenderungen.length > 10) {
    throw new Error('zwischen 1 und 10 Änderungen erwartet')
  }
  const gesehen = new Set()
  for (const a of v.aenderungen) {
    if (!a || typeof a.datei !== 'string' || !NAME_MUSTER.test(a.datei)) {
      throw new Error(`ungültiger Dateiname: ${a && a.datei}`)
    }
    if (gesehen.has(a.datei)) throw new Error(`Datei doppelt: ${a.datei}`)
    gesehen.add(a.datei)
    if (a.aktion === 'schreiben') {
      if (typeof a.inhalt !== 'string' || !a.inhalt.trim() || a.inhalt.length > MAX_NOTIZ) {
        throw new Error(`Inhalt fehlt oder zu groß: ${a.datei}`)
      }
      if (enthaeltGeheimnis(a.inhalt)) throw new Error(`${a.datei} sieht nach Passwort oder Schlüssel aus`)
    } else if (a.aktion !== 'loeschen') {
      throw new Error('unbekannte Aktion')
    }
  }
}

// Wird vom Nachtlauf benutzt: merkt sich, wie die Notizen JETZT aussehen.
export function ergaenzeHashes(v) {
  for (const a of v.aenderungen) {
    const bisher = leseNotiz(a.datei)
    a.vorherHash = bisher === null ? null : hash(bisher)
  }
}

export function leseVorschlaege(hinweise = []) {
  let dateien = []
  try {
    dateien = fs.readdirSync(VORSCHLAEGE).filter((n) => n.endsWith('.json')).sort()
  } catch {
    return []
  }
  const liste = []
  for (const dateiname of dateien.slice(0, 100)) {
    const id = dateiname.replace(/\.json$/, '')
    try {
      if (!ID_MUSTER.test(id)) throw new Error('ungültiger Dateiname')
      const v = ladeVorschlag(id)
      liste.push({
        id,
        art: v.art,
        titel: v.titel,
        begruendung: v.begruendung,
        erstellt: v.erstellt || null,
        aenderungen: v.aenderungen.map((a) => {
          const bisher = leseNotiz(a.datei)
          return {
            datei: a.datei,
            aktion: a.aktion,
            inhalt: a.aktion === 'schreiben' ? a.inhalt : null,
            bisher,
            veraltet: (bisher === null ? null : hash(bisher)) !== (a.vorherHash ?? null),
          }
        }),
      })
    } catch (fehler) {
      hinweise.push(`vorschlaege/${dateiname}: ${fehler.message}`)
    }
  }
  return liste
}

function ladeVorschlag(id) {
  const datei = path.join(VORSCHLAEGE, `${id}.json`)
  const info = fs.lstatSync(datei)
  if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error('keine gültige Datei')
  const v = JSON.parse(fs.readFileSync(datei, 'utf8'))
  pruefeVorschlag(v)
  return v
}

// Übernehmen oder Verwerfen. Nur "uebernehmen" ändert gehirn/.
export function entscheide(id, aktion) {
  if (typeof id !== 'string' || !ID_MUSTER.test(id)) throw new Error('Ungültiger Vorschlag.')
  if (aktion !== 'uebernehmen' && aktion !== 'verwerfen') throw new Error('Unbekannte Aktion.')
  const v = ladeVorschlag(id)

  if (aktion === 'uebernehmen') {
    // Erst alles prüfen, dann erst schreiben – so bleibt nichts halb fertig.
    for (const a of v.aenderungen) {
      const bisher = leseNotiz(a.datei)
      if ((bisher === null ? null : hash(bisher)) !== (a.vorherHash ?? null)) {
        throw new Error(
          `"${a.datei}" wurde seit dem Vorschlag geändert. Bitte verwerfen und den nächsten Nachtlauf abwarten.`
        )
      }
    }
    for (const a of v.aenderungen) {
      const ziel = path.join(GEHIRN, a.datei)
      if (path.dirname(ziel) !== GEHIRN) throw new Error('Ungültiger Pfad.')
      if (a.aktion === 'schreiben') {
        fs.mkdirSync(GEHIRN, { recursive: true })
        fs.writeFileSync(ziel, a.inhalt.endsWith('\n') ? a.inhalt : a.inhalt + '\n')
      } else if (fs.existsSync(ziel)) {
        fs.unlinkSync(ziel)
      }
    }
  }

  // Der Vorschlag wandert ins Archiv, damit nachvollziehbar bleibt, was entschieden wurde.
  v.entscheidung = aktion
  v.entschiedenAm = new Date().toISOString()
  schreibeSicher(path.join(VORSCHLAEGE, 'erledigt', `${id}.json`), JSON.stringify(v, null, 1))
  fs.unlinkSync(path.join(VORSCHLAEGE, `${id}.json`))
}
