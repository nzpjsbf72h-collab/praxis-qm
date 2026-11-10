#!/usr/bin/env node
// Trägt die Statuszeile in deine Claude-Code-Einstellungen ein – oder wieder aus.
//
//   node agentic-os/statuszeile-einrichten.mjs        zeigt die Änderung und fragt nach
//   node agentic-os/statuszeile-einrichten.mjs aus    entfernt den Eintrag wieder
//
// Geändert wird nur der eine Eintrag "statusLine" in ~/.claude/settings.json.
// Vorher wird eine Sicherungskopie daneben abgelegt.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const EINSTELLUNGEN = path.join(os.homedir(), '.claude', 'settings.json')
const SKRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'statuszeile.mjs')
const BEFEHL = `"${process.execPath}" "${SKRIPT}"`
const aus = process.argv[2] === 'aus'

if (/["$`\\]/.test(process.execPath + SKRIPT)) {
  console.error('Der Pfad enthält Sonderzeichen (" $ ` \\). Bitte den Projektordner umbenennen.')
  process.exit(1)
}

let einstellungen = {}
let vorhanden = false
try {
  einstellungen = JSON.parse(fs.readFileSync(EINSTELLUNGEN, 'utf8'))
  vorhanden = true
} catch (fehler) {
  if (fehler.code !== 'ENOENT') {
    console.error(`${EINSTELLUNGEN} ist nicht lesbar (${fehler.message}). Es wurde nichts geändert.`)
    process.exit(1)
  }
}

const bisher = einstellungen.statusLine
const neu = aus ? undefined : { type: 'command', command: BEFEHL }
const zeige = (wert) => (wert === undefined ? '  (kein Eintrag)' : JSON.stringify({ statusLine: wert }, null, 2))

if (aus && !(bisher && typeof bisher.command === 'string' && bisher.command.includes(SKRIPT))) {
  console.log('Die Cockpit-Statuszeile ist nicht eingetragen. Es wurde nichts geändert.')
  process.exit(0)
}

console.log(`Datei: ${EINSTELLUNGEN}${vorhanden ? '' : '  (wird neu angelegt)'}\n`)
console.log('Bisher:')
console.log(zeige(bisher))
console.log('\nNeu:')
console.log(zeige(neu))
if (!aus && bisher !== undefined) {
  console.log('\nAchtung: Deine bisherige Statuszeile wird ersetzt.')
}
console.log('\nAlle anderen Einstellungen bleiben unverändert.')

const frage = readline.createInterface({ input: process.stdin, output: process.stdout })
const antwort = (await frage.question('\nSo übernehmen? (j/n) ')).trim().toLowerCase()
frage.close()
if (antwort !== 'j' && antwort !== 'ja') {
  console.log('Abgebrochen. Es wurde nichts geändert.')
  process.exit(0)
}

if (vorhanden) {
  const sicherung = `${EINSTELLUNGEN}.sicherung-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(EINSTELLUNGEN, sicherung)
  console.log(`Sicherungskopie: ${sicherung}`)
}
if (aus) delete einstellungen.statusLine
else einstellungen.statusLine = neu
fs.mkdirSync(path.dirname(EINSTELLUNGEN), { recursive: true })
fs.writeFileSync(EINSTELLUNGEN, JSON.stringify(einstellungen, null, 2) + '\n')
console.log(aus ? 'Statuszeile entfernt.' : 'Statuszeile eingetragen. Sie erscheint ab der nächsten Claude-Code-Sitzung.')
