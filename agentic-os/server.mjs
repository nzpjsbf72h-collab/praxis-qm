// Agentic OS – das Cockpit. Kleiner lokaler Webserver.
//
// Sicherheits-Grundsätze:
//  - lauscht NUR auf 127.0.0.1 (aus dem Netz nicht erreichbar)
//  - Zugang nur mit dem Schlüssel aus der Start-Adresse (schützt auch vor
//    anderen Programmen und Benutzern auf demselben Rechner)
//  - Ändern/Starten nur per Klick im Cockpit selbst (fremde Webseiten werden abgelehnt)
//  - liefert nur fest eingetragene Dateien aus
//  - keine fremden Pakete, nur Bordmittel von Node.js

import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import {
  COCKPIT, DATEN, LIMITS_DATEI, SCHLUESSEL_DATEI, NACHT_LOG, ZEITPLAN_NAME, CRON_MARKE,
  findeProgramm, leseEnde,
} from './pfade.mjs'
import { agentenStand, starteAufgabe, stoppeAufgabe, stoppeAlles } from './agenten.mjs'
import { leseGehirn, leseVorschlaege, entscheide } from './gehirn.mjs'

const ADRESSE = '127.0.0.1' // absichtlich fest – nicht ändern
const PORT = lesePort(process.env.AGENTIC_OS_PORT, 4747)
const URSPRUENGE = [`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]
const KEKS = `aos_${PORT}`
const SCHLUESSEL = ladeSchluessel()
const OBERFLAECHE = path.join(COCKPIT, 'public')

// Die einzigen Dateien, die der Server ausliefert.
const SEITEN = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
}

const SICHERHEITS_KOPFZEILEN = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; " +
    "img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-store',
}

function lesePort(wert, standard) {
  if (wert === undefined || wert === '') return standard
  const zahl = Number(wert)
  if (Number.isInteger(zahl) && zahl >= 1024 && zahl <= 65535) return zahl
  console.error(`Ungültiger Port "${wert}" – erlaubt sind 1024 bis 65535.`)
  process.exit(1)
}

// Der Zugangsschlüssel wird einmal erzeugt und liegt nur für dich lesbar in daten/schluessel.
function ladeSchluessel() {
  try {
    const vorhanden = fs.readFileSync(SCHLUESSEL_DATEI, 'utf8').trim()
    if (/^[A-Za-z0-9_-]{40,}$/.test(vorhanden)) return vorhanden
  } catch {
    // noch keiner da
  }
  const neu = crypto.randomBytes(32).toString('base64url')
  fs.mkdirSync(DATEN, { recursive: true })
  fs.writeFileSync(SCHLUESSEL_DATEI, neu + '\n', { mode: 0o600 })
  fs.chmodSync(SCHLUESSEL_DATEI, 0o600)
  return neu
}

function gleich(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

function hatZugang(req) {
  for (const teil of (req.headers.cookie || '').split(';')) {
    const [name, wert] = teil.trim().split('=')
    if (name === KEKS && wert && gleich(wert, SCHLUESSEL)) return true
  }
  return false
}

function antworte(res, status, typ, inhalt, zusatz = {}) {
  res.writeHead(status, { ...SICHERHEITS_KOPFZEILEN, 'Content-Type': typ, ...zusatz })
  res.end(inhalt)
}

function antworteJson(res, status, daten) {
  antworte(res, status, 'application/json; charset=utf-8', JSON.stringify(daten))
}

function leseKoerper(req) {
  return new Promise((erfolg, fehler) => {
    let text = ''
    req.setEncoding('utf8')
    req.on('data', (stueck) => {
      text += stueck
      if (text.length > 100_000) {
        fehler(new Error('Anfrage zu groß.'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        const daten = JSON.parse(text)
        if (!daten || typeof daten !== 'object') throw new Error()
        erfolg(daten)
      } catch {
        fehler(new Error('Ungültige Anfrage.'))
      }
    })
    req.on('error', fehler)
  })
}

// ---------- Limits (geschrieben von statuszeile.mjs) ----------

function leseLimits() {
  const zeilen = leseEnde(LIMITS_DATEI, 2 * 1024 * 1024).split('\n')
  const seit = Date.now() - 7 * 24 * 3600 * 1000
  const eimer = new Map() // ein Wert je 5 Minuten reicht für den Verlauf
  let letzter = null
  for (const zeile of zeilen) {
    let e
    try {
      e = JSON.parse(zeile)
    } catch {
      continue
    }
    const zeit = Date.parse(e.zeit)
    if (!Number.isFinite(zeit) || zeit < seit) continue
    const eintrag = { zeit: e.zeit, sitzung: zahlOderNull(e.sitzung), woche: zahlOderNull(e.woche) }
    eimer.set(Math.floor(zeit / 300_000), eintrag)
    letzter = eintrag
  }
  return { letzter, verlauf: [...eimer.values()] }
}

function zahlOderNull(wert) {
  return typeof wert === 'number' && Number.isFinite(wert) ? wert : null
}

// ---------- Nacht: läuft der Zeitplan, was stand zuletzt im Protokoll? ----------

let zeitplanStand = { zeit: 0, wert: 'unbekannt' }

function pruefeZeitplan() {
  if (Date.now() - zeitplanStand.zeit < 60_000) return
  zeitplanStand.zeit = Date.now()
  if (process.platform === 'darwin') {
    const plist = path.join(os.homedir(), 'Library', 'LaunchAgents', `${ZEITPLAN_NAME}.plist`)
    zeitplanStand.wert = fs.existsSync(plist) ? 'an' : 'aus'
    return
  }
  const crontab = findeProgramm('crontab')
  if (!crontab) {
    zeitplanStand.wert = 'unbekannt'
    return
  }
  execFile(crontab, ['-l'], { timeout: 3000 }, (fehler, ausgabe) => {
    zeitplanStand.wert = !fehler && ausgabe.includes(CRON_MARKE) ? 'an' : 'aus'
  })
}

async function stand() {
  const hinweise = []
  pruefeZeitplan()
  return {
    agenten: await agentenStand(),
    gehirn: leseGehirn(hinweise),
    vorschlaege: leseVorschlaege(hinweise),
    nacht: {
      zeitplan: zeitplanStand.wert,
      protokoll: leseEnde(NACHT_LOG, 3000).split('\n').filter(Boolean).slice(-12),
    },
    limits: leseLimits(),
    hinweise,
    gelesenUm: new Date().toISOString(),
  }
}

// ---------- Anfragen ----------

async function bearbeite(req, res) {
  // Schutz gegen "DNS-Rebinding": nur Aufrufe über die lokale Adresse zulassen.
  if (!URSPRUENGE.includes(`http://${req.headers.host}`)) {
    return antworte(res, 403, 'text/plain; charset=utf-8', 'Nicht erlaubt.')
  }
  const url = new URL(req.url, URSPRUENGE[0])
  const pfad = url.pathname

  // Anmelden: die Start-Adresse aus dem Terminal enthält den Schlüssel.
  if (req.method === 'GET' && pfad === '/' && url.searchParams.has('schluessel')) {
    if (!gleich(url.searchParams.get('schluessel'), SCHLUESSEL)) {
      return antworte(res, 403, 'text/plain; charset=utf-8', 'Falscher Schlüssel.')
    }
    return antworte(res, 302, 'text/plain; charset=utf-8', '', {
      'Set-Cookie': `${KEKS}=${SCHLUESSEL}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`,
      Location: '/',
    })
  }
  if (!hatZugang(req)) {
    return antworte(
      res, 401, 'text/plain; charset=utf-8',
      'Kein Zugang. Bitte öffne die Adresse, die beim Start des Cockpits im Terminal steht\n' +
        '(sie enthält deinen Schlüssel).'
    )
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (pfad === '/api/stand') return antworteJson(res, 200, await stand())
    if (Object.hasOwn(SEITEN, pfad)) {
      const [datei, typ] = SEITEN[pfad]
      return antworte(res, 200, typ, fs.readFileSync(path.join(OBERFLAECHE, datei)))
    }
    return antworte(res, 404, 'text/plain; charset=utf-8', 'Nicht gefunden.')
  }

  if (req.method === 'POST') {
    // Nur das Cockpit selbst darf etwas auslösen – keine fremde Webseite.
    const typ = (req.headers['content-type'] || '').split(';')[0].trim()
    if (!URSPRUENGE.includes(req.headers.origin) || typ !== 'application/json') {
      return antworteJson(res, 403, { fehler: 'Nicht erlaubt.' })
    }
    try {
      const daten = await leseKoerper(req)
      if (pfad === '/api/aufgabe/start') {
        return antworteJson(res, 200, { id: await starteAufgabe(daten.agent, daten.aufgabe) })
      }
      if (pfad === '/api/aufgabe/stopp') {
        await stoppeAufgabe(daten.id)
        return antworteJson(res, 200, { ok: true })
      }
      if (pfad === '/api/vorschlag') {
        entscheide(daten.id, daten.aktion)
        return antworteJson(res, 200, { ok: true })
      }
      return antworteJson(res, 404, { fehler: 'Nicht gefunden.' })
    } catch (fehler) {
      return antworteJson(res, 400, { fehler: fehler.message })
    }
  }

  antworte(res, 405, 'text/plain; charset=utf-8', 'Nicht erlaubt.')
}

const server = http.createServer((req, res) => {
  bearbeite(req, res).catch((fehler) => {
    console.error(fehler)
    if (!res.headersSent) antworte(res, 500, 'text/plain; charset=utf-8', 'Interner Fehler.')
  })
})

server.on('error', (fehler) => {
  if (fehler.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} ist schon belegt. Läuft das Cockpit bereits? Sonst anderen Port wählen:`)
    console.error('  AGENTIC_OS_PORT=4848 node agentic-os/server.mjs')
  } else {
    console.error(fehler.message)
  }
  process.exit(1)
})

server.listen(PORT, ADRESSE, () => {
  console.log('Agentic OS läuft.')
  console.log(`  Adresse:  http://${ADRESSE}:${PORT}/?schluessel=${SCHLUESSEL}`)
  console.log('  Stoppen:  Strg + C in diesem Fenster (hält auch laufende Aufgaben an)')
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stoppeAlles()
    console.log('\nAgentic OS wurde gestoppt.')
    server.close(() => process.exit(0))
    server.closeAllConnections()
  })
}
