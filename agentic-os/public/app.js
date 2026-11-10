// Agentic OS – Oberfläche.
// Holt alle 5 Sekunden den aktuellen Stand vom lokalen Server und zeichnet die Seite.
// Texte werden immer als reiner Text eingesetzt (nie als HTML) – so kann
// nichts aus den Daten-Dateien als Code ausgeführt werden.

'use strict'

const SEITEN = {
  cockpit: ['Cockpit', 'Die Übersicht: was läuft, was zuletzt passiert ist.', zeigeCockpit],
  agenten: ['Agenten', 'Alle Agenten und ihr Zustand.', zeigeAgenten],
  gehirn: ['Gehirn', 'Notizen und Wissen aus dem Ordner daten/gehirn.', zeigeGehirn],
  nacht: ['Nacht', 'Aufgaben, die nachts erledigt werden sollen.', zeigeNacht],
}

const FARBE = { 'läuft': 'gruen', wartet: 'gelb', fehler: 'rot', gestoppt: 'grau' }

let stand = null

// Kleiner Helfer: baut ein Element mit Klasse, Text und Kindern.
function el(tag, klasse, text, kinder) {
  const e = document.createElement(tag)
  if (klasse) e.className = klasse
  if (text !== undefined && text !== null) e.textContent = String(text)
  for (const kind of kinder || []) e.append(kind)
  return e
}

function zeit(iso) {
  const d = new Date(iso)
  if (!iso || isNaN(d)) return '–'
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function leer(text) {
  return el('div', 'leer', text)
}

function statusMarke(status) {
  return el('span', 'marke-status ' + (FARBE[status] || 'grau'), status || 'unbekannt')
}

function agentKachel(a) {
  return el('div', 'kachel', null, [
    el('div', 'kopfzeile', null, [el('span', 'name', a.name), statusMarke(a.status)]),
    el('div', null, a.aufgabe || ''),
    el('div', 'leise', a.seit ? 'seit ' + zeit(a.seit) : ''),
  ])
}

function zahlKachel(zahl, text, farbe) {
  return el('div', 'kachel', null, [el('div', 'zahl ' + (farbe || ''), zahl), el('div', 'leise', text)])
}

function ereignisListe(ereignisse) {
  if (!ereignisse.length) return leer('Noch keine Ereignisse.')
  return el('ul', 'liste', null, ereignisse.map((e) =>
    el('li', null, null, [
      el('span', 'zeit', zeit(e.zeit)),
      el('span', null, null, [el('span', 'wer', (e.agent || '') + ' '), el('span', null, e.text)]),
    ])
  ))
}

function neuesteZuerst(ereignisse) {
  return [...ereignisse].sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)))
}

function zeigeCockpit(s) {
  const laufend = s.agenten.filter((a) => a.status === 'läuft')
  const fehler = s.agenten.filter((a) => a.status === 'fehler')
  const nachtAktiv = s.nacht.filter((n) => n.aktiv)
  return [
    el('div', 'raster', null, [
      zahlKachel(laufend.length, 'Agenten laufen gerade', 'gruen'),
      zahlKachel(fehler.length, 'Agenten mit Fehler', fehler.length ? 'rot' : ''),
      zahlKachel(nachtAktiv.length, 'Aufgaben für heute Nacht'),
      zahlKachel(s.gehirn.length, 'Notizen im Gehirn'),
    ]),
    el('h2', null, 'Läuft gerade'),
    laufend.length ? el('div', 'raster', null, laufend.map(agentKachel)) : leer('Im Moment läuft kein Agent.'),
    el('h2', null, 'Zuletzt passiert'),
    ereignisListe(neuesteZuerst(s.ereignisse).slice(0, 8)),
  ]
}

function zeigeAgenten(s) {
  if (!s.agenten.length) return [leer('Noch keine Agenten eingetragen (daten/agenten.json).')]
  return [el('div', 'raster', null, s.agenten.map(agentKachel))]
}

function zeigeGehirn(s) {
  if (!s.gehirn.length) return [leer('Noch keine Notizen. Lege eine .md-Datei in daten/gehirn ab.')]
  return s.gehirn.map((n) =>
    el('div', 'kachel notiz', null, [el('div', 'name', n.titel), el('pre', null, n.text)])
  ).flatMap((k) => [k, el('div', 'leise', ' ')])
}

function zeigeNacht(s) {
  if (!s.nacht.length) return [leer('Keine Nacht-Aufgaben eingetragen (daten/nacht.json).')]
  return [el('div', 'raster', null, s.nacht.map((n) =>
    el('div', 'kachel', null, [
      el('div', 'kopfzeile', null, [
        el('span', 'name', (n.uhrzeit || '') + ' Uhr'),
        el('span', 'marke-status ' + (n.aktiv ? 'gruen' : 'grau'), n.aktiv ? 'aktiv' : 'pausiert'),
      ]),
      el('div', null, n.aufgabe || ''),
      el('div', 'leise', n.agent ? 'Agent: ' + n.agent : ''),
      el('div', 'leise', 'Letzter Lauf: ' + zeit(n.letzterLauf) + (n.ergebnis ? ' – ' + n.ergebnis : '')),
    ])
  ))]
}

function aktuelleSeite() {
  const name = location.hash.slice(1)
  return Object.hasOwn(SEITEN, name) ? name : 'cockpit'
}

function zeichne() {
  const name = aktuelleSeite()
  const [titel, untertitel, zeige] = SEITEN[name]
  document.getElementById('titel').textContent = titel
  document.getElementById('untertitel').textContent = untertitel
  for (const a of document.querySelectorAll('#menue a')) {
    a.classList.toggle('aktiv', a.getAttribute('href') === '#' + name)
  }
  if (!stand) return
  document.getElementById('hinweise').replaceChildren(
    ...stand.hinweise.map((h) => el('div', 'warnung', 'Problem beim Lesen – ' + h))
  )
  document.getElementById('inhalt').replaceChildren(...zeige(stand))
}

async function lade() {
  const punkt = document.getElementById('verbindung')
  const text = document.getElementById('verbindungstext')
  try {
    const antwort = await fetch('/api/stand', { cache: 'no-store' })
    if (!antwort.ok) throw new Error('Status ' + antwort.status)
    stand = await antwort.json()
    punkt.className = 'punkt gruen'
    text.textContent = 'verbunden'
    zeichne()
  } catch {
    punkt.className = 'punkt rot'
    text.textContent = 'Server gestoppt'
  }
}

window.addEventListener('hashchange', zeichne)
zeichne()
lade()
setInterval(lade, 5000)
