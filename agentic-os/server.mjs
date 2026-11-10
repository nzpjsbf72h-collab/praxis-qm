// Agentic OS – kleiner lokaler Webserver.
//
// Sicherheits-Grundsätze:
//  - lauscht NUR auf 127.0.0.1 (aus dem Netz nicht erreichbar)
//  - nur Lesen (GET/HEAD) – die App kann nichts verändern oder ausführen
//  - liefert nur fest eingetragene Dateien aus (keine frei wählbaren Pfade)
//  - keine fremden Pakete, nur Bordmittel von Node.js

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ADRESSE = '127.0.0.1' // absichtlich fest – nicht ändern
const PORT = leseport(process.env.AGENTIC_OS_PORT, 4747)

const ORDNER = path.dirname(fileURLToPath(import.meta.url))
const OBERFLAECHE = path.join(ORDNER, 'public')
const DATEN = path.join(ORDNER, 'daten')
const MAX_BYTES = 200 * 1024 // größere Dateien werden nicht gelesen

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

function leseport(wert, standard) {
  if (wert === undefined || wert === '') return standard
  const zahl = Number(wert)
  if (Number.isInteger(zahl) && zahl >= 1024 && zahl <= 65535) return zahl
  console.error(`Ungültiger Port "${wert}" – erlaubt sind 1024 bis 65535.`)
  process.exit(1)
}

function antworte(res, status, typ, inhalt) {
  res.writeHead(status, { ...SICHERHEITS_KOPFZEILEN, 'Content-Type': typ })
  res.end(inhalt)
}

// Liest eine Datei aus daten/. Fehler landen als Hinweis in der Oberfläche.
function leseText(datei) {
  const info = fs.lstatSync(datei)
  if (!info.isFile()) throw new Error('keine normale Datei')
  if (info.size > MAX_BYTES) throw new Error('Datei ist zu groß')
  return fs.readFileSync(datei, 'utf8')
}

function leseListe(name, hinweise) {
  try {
    const daten = JSON.parse(leseText(path.join(DATEN, name)))
    if (!Array.isArray(daten)) throw new Error('erwartet wird eine Liste [ ... ]')
    return daten
  } catch (fehler) {
    hinweise.push(`daten/${name}: ${fehler.message}`)
    return []
  }
}

function leseGehirn(hinweise) {
  const ordner = path.join(DATEN, 'gehirn')
  let namen = []
  try {
    namen = fs.readdirSync(ordner).filter((n) => n.endsWith('.md')).sort()
  } catch (fehler) {
    hinweise.push(`daten/gehirn: ${fehler.message}`)
  }
  const notizen = []
  for (const name of namen.slice(0, 200)) {
    try {
      notizen.push({ titel: name.replace(/\.md$/, ''), text: leseText(path.join(ordner, name)) })
    } catch (fehler) {
      hinweise.push(`daten/gehirn/${name}: ${fehler.message}`)
    }
  }
  return notizen
}

function stand() {
  const hinweise = []
  return {
    agenten: leseListe('agenten.json', hinweise),
    ereignisse: leseListe('ereignisse.json', hinweise),
    nacht: leseListe('nacht.json', hinweise),
    gehirn: leseGehirn(hinweise),
    hinweise,
    gelesenUm: new Date().toISOString(),
  }
}

const server = http.createServer((req, res) => {
  // Schutz gegen "DNS-Rebinding": nur Aufrufe über die lokale Adresse zulassen.
  const erlaubt = [`127.0.0.1:${PORT}`, `localhost:${PORT}`]
  if (!erlaubt.includes(req.headers.host)) {
    return antworte(res, 403, 'text/plain; charset=utf-8', 'Nicht erlaubt.')
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return antworte(res, 405, 'text/plain; charset=utf-8', 'Nur Lesen ist erlaubt.')
  }

  const pfad = req.url.split('?')[0]

  if (pfad === '/api/stand') {
    return antworte(res, 200, 'application/json; charset=utf-8', JSON.stringify(stand()))
  }

  const seite = SEITEN[pfad]
  if (seite && Object.hasOwn(SEITEN, pfad)) {
    const [datei, typ] = seite
    return antworte(res, 200, typ, fs.readFileSync(path.join(OBERFLAECHE, datei)))
  }

  antworte(res, 404, 'text/plain; charset=utf-8', 'Nicht gefunden.')
})

server.on('error', (fehler) => {
  if (fehler.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} ist schon belegt. Läuft die App bereits? Sonst anderen Port wählen:`)
    console.error('  AGENTIC_OS_PORT=4848 node agentic-os/server.mjs')
  } else {
    console.error(fehler.message)
  }
  process.exit(1)
})

server.listen(PORT, ADRESSE, () => {
  console.log('Agentic OS läuft.')
  console.log(`  Adresse:  http://${ADRESSE}:${PORT}`)
  console.log('  Stoppen:  Strg + C in diesem Fenster')
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('\nAgentic OS wurde gestoppt.')
    server.close(() => process.exit(0))
    server.closeAllConnections()
  })
}
