// Agenten: Aufgaben starten, verfolgen und stoppen.
//
//  - Claude Code:  claude -p "Aufgabe"
//  - Codex:        codex exec "Aufgabe"
//  - Hermes:       eigener API-Server (POST /v1/runs), nur auf 127.0.0.1
//
// Sicherheit: Programme werden OHNE Shell gestartet, die Aufgabe ist genau ein
// Argument. Es werden keine Schalter gesetzt, die Rückfragen der Agenten umgehen.

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { WURZEL, AUFGABEN_DATEI, findeProgramm, schreibeSicher } from './pfade.mjs'

const MAX_GLEICHZEITIG = 3
const MAX_DAUER_MS = 30 * 60 * 1000 // danach wird eine Aufgabe abgebrochen
const MAX_AUSGABE = 200 * 1024
const MAX_GEMERKT = 60 // so viele Aufgaben bleiben in der Liste

const PROGRAMME = {
  claude: { name: 'Claude Code', programm: 'claude', argumente: (aufgabe) => ['-p', aufgabe] },
  codex: { name: 'Codex', programm: 'codex', argumente: (aufgabe) => ['exec', aufgabe] },
}

let aufgaben = ladeAufgaben()
const prozesse = new Map() // id -> laufender Prozess
const hermesLaeufe = new Map() // id -> { runId, timer }

function ladeAufgaben() {
  try {
    const liste = JSON.parse(fs.readFileSync(AUFGABEN_DATEI, 'utf8'))
    // Was beim letzten Beenden noch lief, läuft jetzt nicht mehr.
    for (const a of liste) {
      if (a.status === 'läuft') {
        a.status = 'unterbrochen'
        a.ende = a.ende || new Date().toISOString()
      }
    }
    return liste
  } catch {
    return []
  }
}

function speichere() {
  aufgaben = aufgaben.slice(-MAX_GEMERKT)
  try {
    schreibeSicher(AUFGABEN_DATEI, JSON.stringify(aufgaben, null, 1))
  } catch (fehler) {
    console.error('Aufgaben konnten nicht gespeichert werden:', fehler.message)
  }
}

function haengeAn(aufgabe, text) {
  aufgabe.ausgabe = (aufgabe.ausgabe + text).slice(-MAX_AUSGABE)
}

function beende(aufgabe, status) {
  if (aufgabe.status !== 'läuft') return
  aufgabe.status = status
  aufgabe.ende = new Date().toISOString()
  speichere()
}

// ---------- Hermes (API-Server) ----------

// Liest nur die Zeilen API_SERVER_* aus ~/.hermes/.env – dort legt Hermes sie selbst ab.
function hermesEinstellungen() {
  const werte = {}
  try {
    const text = fs.readFileSync(path.join(os.homedir(), '.hermes', '.env'), 'utf8')
    for (const zeile of text.split('\n')) {
      const treffer = zeile.match(/^\s*(API_SERVER_[A-Z_]+)\s*=\s*(.*?)\s*$/)
      if (treffer) werte[treffer[1]] = treffer[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // keine Datei – dann gelten nur Umgebungsvariablen
  }
  const hole = (name) => process.env[name] || werte[name] || ''
  const port = Number(hole('API_SERVER_PORT')) || 8642
  return {
    schluessel: hole('API_SERVER_KEY'),
    // Absichtlich immer 127.0.0.1: der Schlüssel verlässt den Rechner nie.
    basis: `http://127.0.0.1:${Number.isInteger(port) && port > 0 && port < 65536 ? port : 8642}`,
  }
}

async function hermesAnfrage(pfad, optionen = {}) {
  const { schluessel, basis } = hermesEinstellungen()
  const antwort = await fetch(basis + pfad, {
    method: optionen.method || 'GET',
    headers: {
      ...(schluessel ? { Authorization: `Bearer ${schluessel}` } : {}),
      ...(optionen.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: optionen.body ? JSON.stringify(optionen.body) : undefined,
    signal: AbortSignal.timeout(optionen.wartezeit || 5000),
    redirect: 'error',
  })
  const text = await antwort.text()
  let daten = null
  try {
    daten = JSON.parse(text)
  } catch {
    // keine JSON-Antwort
  }
  return { ok: antwort.ok, status: antwort.status, daten }
}

let hermesZwischenstand = { zeit: 0, wert: null }

async function hermesZustand() {
  if (Date.now() - hermesZwischenstand.zeit < 10_000) return hermesZwischenstand.wert
  const vorhanden =
    Boolean(findeProgramm('hermes')) || fs.existsSync(path.join(os.homedir(), '.hermes'))
  let erreichbar = false
  try {
    erreichbar = (await hermesAnfrage('/health', { wartezeit: 1500 })).ok
  } catch {
    // API-Server läuft nicht
  }
  let wert
  if (!vorhanden && !erreichbar) {
    wert = { bereit: false, hinweis: 'Hermes ist auf diesem Rechner nicht installiert.' }
  } else if (!erreichbar) {
    wert = {
      bereit: false,
      hinweis:
        'Hermes ist installiert, aber sein API-Server läuft nicht. In ~/.hermes/.env ' +
        'API_SERVER_ENABLED=true und API_SERVER_KEY=<eigener Schlüssel> eintragen, dann ' +
        '"hermes gateway" starten.',
    }
  } else if (!hermesEinstellungen().schluessel) {
    wert = {
      bereit: false,
      hinweis:
        'Der Hermes-API-Server läuft, aber es fehlt der Schlüssel. Trage API_SERVER_KEY in ' +
        '~/.hermes/.env ein und starte das Cockpit neu.',
    }
  } else {
    wert = { bereit: true, hinweis: '' }
  }
  hermesZwischenstand = { zeit: Date.now(), wert }
  return wert
}

async function starteHermes(aufgabe) {
  const antwort = await hermesAnfrage('/v1/runs', {
    method: 'POST',
    body: { input: aufgabe.aufgabe },
    wartezeit: 15000,
  })
  const runId = antwort.daten && antwort.daten.run_id
  if (!antwort.ok || typeof runId !== 'string') {
    throw new Error(`Hermes hat die Aufgabe nicht angenommen (Status ${antwort.status}).`)
  }
  const frist = Date.now() + MAX_DAUER_MS
  const timer = setInterval(async () => {
    try {
      if (Date.now() > frist) {
        await stoppeHermes(aufgabe.id)
        haengeAn(aufgabe, '\n[Cockpit] Zeit überschritten – abgebrochen.')
        return fertigHermes(aufgabe, 'abgebrochen')
      }
      const stand = await hermesAnfrage(`/v1/runs/${encodeURIComponent(runId)}`)
      const s = stand.daten && stand.daten.status
      if (s === 'completed') {
        aufgabe.ausgabe = String(stand.daten.output || '').slice(-MAX_AUSGABE)
        fertigHermes(aufgabe, 'fertig')
      } else if (s === 'failed' || s === 'interrupted') {
        aufgabe.ausgabe = String(stand.daten.error || stand.daten.output || s).slice(-MAX_AUSGABE)
        fertigHermes(aufgabe, 'fehler')
      } else if (s === 'cancelled') {
        fertigHermes(aufgabe, 'gestoppt')
      } else if (stand.status === 404) {
        haengeAn(aufgabe, '[Cockpit] Hermes kennt diesen Lauf nicht mehr.')
        fertigHermes(aufgabe, 'fehler')
      }
    } catch {
      // Hermes gerade nicht erreichbar – beim nächsten Mal wieder versuchen
    }
  }, 3000)
  hermesLaeufe.set(aufgabe.id, { runId, timer })
}

function fertigHermes(aufgabe, status) {
  const lauf = hermesLaeufe.get(aufgabe.id)
  if (lauf) clearInterval(lauf.timer)
  hermesLaeufe.delete(aufgabe.id)
  beende(aufgabe, status)
}

async function stoppeHermes(id) {
  const lauf = hermesLaeufe.get(id)
  if (!lauf) return
  await hermesAnfrage(`/v1/runs/${encodeURIComponent(lauf.runId)}/stop`, { method: 'POST', body: {} })
}

// ---------- Claude Code und Codex (Programme) ----------

function starteProgramm(aufgabe, pfad) {
  const prozess = spawn(pfad, PROGRAMME[aufgabe.agent].argumente(aufgabe.aufgabe), {
    cwd: WURZEL,
    shell: false, // wichtig: keine Shell, also keine eingeschleusten Befehle
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  prozesse.set(aufgabe.id, prozess)
  const frist = setTimeout(() => {
    haengeAn(aufgabe, '\n[Cockpit] Zeit überschritten – abgebrochen.')
    prozess.kill('SIGTERM')
    beende(aufgabe, 'abgebrochen')
  }, MAX_DAUER_MS)

  prozess.stdout.on('data', (stueck) => haengeAn(aufgabe, stueck.toString('utf8')))
  prozess.stderr.on('data', (stueck) => haengeAn(aufgabe, stueck.toString('utf8')))
  prozess.on('error', (fehler) => {
    haengeAn(aufgabe, `[Cockpit] Start fehlgeschlagen: ${fehler.message}`)
    clearTimeout(frist)
    prozesse.delete(aufgabe.id)
    beende(aufgabe, 'fehler')
  })
  prozess.on('close', (code) => {
    clearTimeout(frist)
    prozesse.delete(aufgabe.id)
    beende(aufgabe, code === 0 ? 'fertig' : 'fehler')
  })
}

// ---------- Was der Server aufruft ----------

export async function agentenStand() {
  const spalten = {}
  for (const [id, p] of Object.entries(PROGRAMME)) {
    const da = Boolean(findeProgramm(p.programm))
    spalten[id] = {
      name: p.name,
      bereit: da,
      hinweis: da ? '' : `${p.name} ist auf diesem Rechner nicht installiert (Befehl "${p.programm}" nicht gefunden).`,
    }
  }
  spalten.hermes = { name: 'Hermes', ...(await hermesZustand()) }
  for (const [id, spalte] of Object.entries(spalten)) {
    spalte.aufgaben = aufgaben
      .filter((a) => a.agent === id)
      .slice(-15)
      .reverse()
      .map((a) => ({ ...a, ausgabe: a.ausgabe.slice(-6000) }))
  }
  return spalten
}

export function alleAufgaben() {
  return aufgaben
}

export async function starteAufgabe(agent, text) {
  if (agent !== 'hermes' && !Object.hasOwn(PROGRAMME, agent)) throw new Error('Unbekannter Agent.')
  if (typeof text !== 'string') throw new Error('Die Aufgabe fehlt.')
  const aufgabeText = text.trim()
  if (!aufgabeText) throw new Error('Die Aufgabe ist leer.')
  if (aufgabeText.length > 4000) throw new Error('Die Aufgabe ist zu lang (höchstens 4000 Zeichen).')
  if (aufgabeText.includes('\0')) throw new Error('Die Aufgabe enthält ungültige Zeichen.')
  // Ein Text, der mit "-" beginnt, könnte vom Programm als Schalter gelesen werden.
  if (aufgabeText.startsWith('-')) throw new Error('Die Aufgabe darf nicht mit "-" beginnen.')
  if (aufgaben.filter((a) => a.status === 'läuft').length >= MAX_GLEICHZEITIG) {
    throw new Error(`Es laufen schon ${MAX_GLEICHZEITIG} Aufgaben. Bitte warten oder eine stoppen.`)
  }

  let pfad = null
  if (agent === 'hermes') {
    hermesZwischenstand.zeit = 0
    const zustand = await hermesZustand()
    if (!zustand.bereit) throw new Error(zustand.hinweis)
  } else {
    pfad = findeProgramm(PROGRAMME[agent].programm)
    if (!pfad) throw new Error(`${PROGRAMME[agent].name} ist nicht installiert.`)
  }

  const aufgabe = {
    id: crypto.randomUUID(),
    agent,
    aufgabe: aufgabeText,
    status: 'läuft',
    start: new Date().toISOString(),
    ende: null,
    ausgabe: '',
  }
  aufgaben.push(aufgabe)
  speichere()

  if (agent === 'hermes') {
    try {
      await starteHermes(aufgabe)
    } catch (fehler) {
      haengeAn(aufgabe, `[Cockpit] ${fehler.message}`)
      beende(aufgabe, 'fehler')
    }
  } else {
    starteProgramm(aufgabe, pfad)
  }
  return aufgabe.id
}

export async function stoppeAufgabe(id) {
  const aufgabe = aufgaben.find((a) => a.id === id)
  if (!aufgabe || aufgabe.status !== 'läuft') throw new Error('Diese Aufgabe läuft nicht (mehr).')
  if (aufgabe.agent === 'hermes') {
    await stoppeHermes(id).catch(() => {})
    fertigHermes(aufgabe, 'gestoppt')
  } else {
    const prozess = prozesse.get(id)
    beende(aufgabe, 'gestoppt')
    if (prozess) prozess.kill('SIGTERM')
  }
}

// Beim Beenden des Cockpits: alles anhalten, was noch läuft.
export function stoppeAlles() {
  for (const aufgabe of aufgaben.filter((a) => a.status === 'läuft')) {
    const prozess = prozesse.get(aufgabe.id)
    if (prozess) prozess.kill('SIGTERM')
    if (hermesLaeufe.has(aufgabe.id)) stoppeHermes(aufgabe.id).catch(() => {})
    aufgabe.status = 'gestoppt'
    aufgabe.ende = new Date().toISOString()
  }
  speichere()
}
