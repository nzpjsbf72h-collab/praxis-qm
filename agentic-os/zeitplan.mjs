#!/usr/bin/env node
// Zeitplan für den Nachtlauf: jede Nacht um 3:00 Uhr.
//
//   node agentic-os/zeitplan.mjs an       einschalten
//   node agentic-os/zeitplan.mjs aus      abschalten
//   node agentic-os/zeitplan.mjs status   nachsehen
//
// Mac: ein launchd-Eintrag in ~/Library/LaunchAgents (nur für deinen Benutzer).
// Linux: eine Zeile in deiner crontab. Es braucht keine Administrator-Rechte.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { COCKPIT, DATEN, ZEITPLAN_NAME, CRON_MARKE, findeProgramm } from './pfade.mjs'

const NODE = process.execPath
const SKRIPT = path.join(COCKPIT, 'nachtlauf.mjs')
const PLIST = path.join(os.homedir(), 'Library', 'LaunchAgents', `${ZEITPLAN_NAME}.plist`)
const befehl = process.argv[2]
const mac = process.platform === 'darwin'

function claudePfad() {
  const pfad = findeProgramm('claude')
  if (!pfad) {
    console.error('Claude Code ("claude") wurde nicht gefunden. Der Zeitplan wurde nicht eingerichtet.')
    process.exit(1)
  }
  return pfad
}

function pruefePfade(...pfade) {
  // Diese Zeichen hätten in launchd- oder cron-Einträgen eine Sonderbedeutung.
  for (const p of pfade) {
    if (/[<>&'"%\n\\]/.test(p)) {
      console.error(`Der Pfad enthält Sonderzeichen: ${p}\nBitte den Ordner umbenennen.`)
      process.exit(1)
    }
  }
}

// ---------- Mac (launchd) ----------

function launchctl(...argumente) {
  try {
    execFileSync('/bin/launchctl', argumente, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function macAn() {
  const claude = claudePfad()
  pruefePfade(NODE, SKRIPT, claude, DATEN)
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${ZEITPLAN_NAME}</string>
  <key>ProgramArguments</key>
  <array><string>${NODE}</string><string>${SKRIPT}</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>
  <key>EnvironmentVariables</key>
  <dict><key>AGENTIC_OS_CLAUDE</key><string>${claude}</string></dict>
  <key>StandardOutPath</key><string>${path.join(DATEN, 'nachtlauf-ausgabe.log')}</string>
  <key>StandardErrorPath</key><string>${path.join(DATEN, 'nachtlauf-ausgabe.log')}</string>
</dict>
</plist>
`
  fs.mkdirSync(path.dirname(PLIST), { recursive: true })
  const ziel = `gui/${os.userInfo().uid}`
  launchctl('bootout', `${ziel}/${ZEITPLAN_NAME}`) // alten Eintrag entfernen, falls vorhanden
  fs.writeFileSync(PLIST, plist, { mode: 0o644 })
  if (!launchctl('bootstrap', ziel, PLIST)) {
    console.error(`launchd hat den Eintrag nicht angenommen. Datei: ${PLIST}`)
    process.exit(1)
  }
  console.log(`Eingeschaltet: jede Nacht um 3:00 Uhr.\nEintrag: ${PLIST}`)
}

function macAus() {
  launchctl('bootout', `gui/${os.userInfo().uid}/${ZEITPLAN_NAME}`)
  if (fs.existsSync(PLIST)) fs.unlinkSync(PLIST)
  console.log('Abgeschaltet. Der Nachtlauf startet nicht mehr von selbst.')
}

// ---------- Linux (cron) ----------

function crontabLesen() {
  try {
    return execFileSync('crontab', ['-l'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString()
  } catch {
    return '' // noch keine crontab
  }
}

function crontabSchreiben(zeilen) {
  execFileSync('crontab', ['-'], { input: zeilen.join('\n') + '\n' })
}

function ohneEintrag() {
  return crontabLesen().split('\n').filter((z) => z.trim() && !z.includes(CRON_MARKE))
}

function linuxAn() {
  if (!findeProgramm('crontab')) {
    console.error('Das Programm "crontab" fehlt auf diesem Rechner. Der Zeitplan wurde nicht eingerichtet.')
    process.exit(1)
  }
  const claude = claudePfad()
  pruefePfade(NODE, SKRIPT, claude)
  const zeile = `0 3 * * * AGENTIC_OS_CLAUDE='${claude}' '${NODE}' '${SKRIPT}' >/dev/null 2>&1 ${CRON_MARKE}`
  crontabSchreiben([...ohneEintrag(), zeile])
  console.log(`Eingeschaltet: jede Nacht um 3:00 Uhr.\nZeile in deiner crontab:\n  ${zeile}`)
}

function linuxAus() {
  if (findeProgramm('crontab')) crontabSchreiben(ohneEintrag())
  console.log('Abgeschaltet. Der Nachtlauf startet nicht mehr von selbst.')
}

// ---------- Auswahl ----------

if (befehl === 'an') mac ? macAn() : linuxAn()
else if (befehl === 'aus') mac ? macAus() : linuxAus()
else if (befehl === 'status') {
  const an = mac ? fs.existsSync(PLIST) : crontabLesen().includes(CRON_MARKE)
  console.log(an ? 'Der Zeitplan ist AN (jede Nacht um 3:00 Uhr).' : 'Der Zeitplan ist AUS.')
} else {
  console.log('Aufruf: node agentic-os/zeitplan.mjs an | aus | status')
  process.exit(1)
}
