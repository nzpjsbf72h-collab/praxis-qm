// Agentic OS – Oberfläche.
// Holt alle 5 Sekunden den Stand vom lokalen Server und zeichnet die gewählte Seite.
// Texte werden immer als reiner Text eingesetzt (nie als HTML) – so kann nichts
// aus Notizen oder Agenten-Ausgaben als Code ausgeführt werden.

'use strict'

// Jede Seite: Titel, Untertitel, welche Daten sie braucht, und wie sie gezeichnet wird.
const SEITEN = {
  cockpit: ['Cockpit', 'Die Übersicht: was läuft, was zuletzt passiert ist.', (s) => s, zeigeCockpit],
  agenten: ['Agenten', 'Aufgabe eintippen, auf Start klicken. Vorher passiert nichts.', (s) => s.agenten, zeigeAgenten],
  gehirn: ['Gehirn', 'Alle Notizen als Netz: jeder Punkt eine Notiz, jede Linie ein Verweis.', (s) => s.gehirn, zeigeGehirn],
  nacht: ['Nacht', 'Vorschläge aus dem Nachtlauf. Erst dein Klick ändert das Gehirn.', (s) => [s.vorschlaege, s.nacht], zeigeNacht],
  limits: ['Limits', 'Wie viel von deinem Claude-Kontingent verbraucht ist.', (s) => s.limits, zeigeLimits],
}

const AGENTEN = ['claude', 'codex', 'hermes']
const STATUS_FARBE = { 'läuft': 'gruen', fertig: 'blau', fehler: 'rot', gestoppt: 'grau', abgebrochen: 'gelb', unterbrochen: 'gelb' }
const ART_NAME = { zusammenfuehren: 'Zusammenführen', veraltet: 'Veraltet', verweise: 'Neue Verweise', regel: 'Neue Regel' }
const WARN_AB = 80 // Prozent

let stand = null
let gezeichnet = '' // was zuletzt gezeichnet wurde – nur bei Änderung neu zeichnen
let meldung = '' // Fehlermeldung nach einem Klick
let gewaehlteNotiz = null
const entwurf = {} // eingetippte, noch nicht gestartete Aufgaben je Agent

// ---------- kleine Helfer ----------

function el(tag, klasse, text, kinder) {
  const e = document.createElement(tag)
  if (klasse) e.className = klasse
  if (text !== undefined && text !== null) e.textContent = String(text)
  for (const kind of kinder || []) if (kind) e.append(kind)
  return e
}

function svg(tag, eigenschaften, kinder) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [name, wert] of Object.entries(eigenschaften || {})) e.setAttribute(name, wert)
  for (const kind of kinder || []) if (kind) e.append(kind)
  return e
}

function knopf(text, klasse, beiKlick) {
  const k = el('button', 'knopf ' + (klasse || ''), text)
  k.type = 'button'
  k.addEventListener('click', beiKlick)
  return k
}

function zeit(iso) {
  const d = new Date(iso)
  if (!iso || isNaN(d)) return '–'
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function leer(text) {
  return el('div', 'leer', text)
}

function marke(text, farbe) {
  return el('span', 'marke-status ' + (farbe || 'grau'), text)
}

function aufklappbar(schluessel, titel, inhalt) {
  const d = el('details', null, null, [el('summary', null, titel), el('pre', 'ausgabe', inhalt)])
  d.dataset.merke = schluessel
  return d
}

async function sende(pfad, daten) {
  meldung = ''
  try {
    const antwort = await fetch(pfad, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(daten),
    })
    const ergebnis = await antwort.json().catch(() => ({}))
    if (!antwort.ok) throw new Error(ergebnis.fehler || 'Das hat nicht geklappt.')
    return true
  } catch (fehler) {
    meldung = fehler.message
    return false
  } finally {
    await lade(true)
  }
}

// ---------- Cockpit ----------

function alleAufgaben(s) {
  return AGENTEN.flatMap((id) => s.agenten[id].aufgaben.map((a) => ({ ...a, agentName: s.agenten[id].name })))
}

function zahlKachel(zahl, text, ziel) {
  const k = el('a', 'kachel kachel-link', null, [el('div', 'zahl', zahl), el('div', 'leise', text)])
  k.href = '#' + ziel
  return k
}

function zeigeCockpit(s) {
  const aufgaben = alleAufgaben(s)
  const laufend = aufgaben.filter((a) => a.status === 'läuft')
  const l = s.limits.letzter
  const prozent = (w) => (w === null || w === undefined ? '–' : Math.round(w) + ' %')

  const ereignisse = []
  for (const a of aufgaben) {
    ereignisse.push({ zeit: a.start, wer: a.agentName, text: 'gestartet: ' + a.aufgabe })
    if (a.ende) ereignisse.push({ zeit: a.ende, wer: a.agentName, text: a.status + ': ' + a.aufgabe })
  }
  for (const zeile of s.nacht.protokoll) {
    const leerzeichen = zeile.indexOf(' ')
    ereignisse.push({ zeit: zeile.slice(0, leerzeichen), wer: 'Nachtlauf', text: zeile.slice(leerzeichen + 1) })
  }
  ereignisse.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)))

  return [
    el('div', 'raster', null, [
      zahlKachel(laufend.length, laufend.length === 1 ? 'Aufgabe läuft gerade' : 'Aufgaben laufen gerade', 'agenten'),
      zahlKachel(s.vorschlaege.length, 'Vorschläge warten auf dich', 'nacht'),
      zahlKachel(s.gehirn.length, 'Notizen im Gehirn', 'gehirn'),
      zahlKachel(l ? prozent(l.sitzung) + ' · ' + prozent(l.woche) : '–', 'Limit Sitzung · Woche', 'limits'),
    ]),
    el('h2', null, 'Läuft gerade'),
    laufend.length
      ? el('div', 'raster', null, laufend.map((a) =>
          el('div', 'kachel', null, [
            el('div', 'kopfzeile', null, [el('span', 'name', a.agentName), marke('läuft', 'gruen')]),
            el('div', null, a.aufgabe),
            el('div', 'leise', 'seit ' + zeit(a.start)),
          ])
        ))
      : leer('Im Moment läuft kein Agent.'),
    el('h2', null, 'Zuletzt passiert'),
    ereignisse.length
      ? el('ul', 'liste', null, ereignisse.slice(0, 10).map((e) =>
          el('li', null, null, [
            el('span', 'zeit', zeit(e.zeit)),
            el('span', null, null, [el('span', 'wer', e.wer + ' '), el('span', null, e.text)]),
          ])
        ))
      : leer('Noch nichts passiert.'),
  ]
}

// ---------- Agenten ----------

function aufgabeKarte(a) {
  return el('div', 'aufgabe', null, [
    el('div', 'kopfzeile', null, [
      el('span', 'leise', zeit(a.start) + (a.ende ? ' – ' + zeit(a.ende) : '')),
      marke(a.status, STATUS_FARBE[a.status]),
    ]),
    el('div', null, a.aufgabe),
    a.status === 'läuft' ? knopf('Stoppen', 'klein', () => sende('/api/aufgabe/stopp', { id: a.id })) : null,
    a.ausgabe ? aufklappbar('ausgabe-' + a.id, 'Ausgabe', a.ausgabe) : null,
  ])
}

function agentSpalte(id, agent) {
  const kopf = el('div', 'kopfzeile', null, [
    el('span', 'name gross', agent.name),
    marke(agent.bereit ? 'bereit' : 'nicht bereit', agent.bereit ? 'gruen' : 'grau'),
  ])
  // Nicht installiert: nur der Hinweis, sonst nichts.
  if (!agent.bereit) return el('section', 'kachel spalte', null, [kopf, el('p', 'leise', agent.hinweis)])

  const feld = el('textarea', 'eingabe')
  feld.rows = 3
  feld.maxLength = 4000
  feld.placeholder = 'Aufgabe für ' + agent.name + ' …'
  feld.value = entwurf[id] || ''
  feld.dataset.merke = 'eingabe-' + id
  feld.setAttribute('aria-label', 'Aufgabe für ' + agent.name)
  const start = knopf('Start', 'haupt', async () => {
    const text = feld.value
    if (!text.trim()) return
    start.disabled = true
    if (await sende('/api/aufgabe/start', { agent: id, aufgabe: text })) entwurf[id] = ''
    gezeichnet = ''
    zeichne()
  })
  start.disabled = !feld.value.trim()
  feld.addEventListener('input', () => {
    entwurf[id] = feld.value
    start.disabled = !feld.value.trim()
  })

  return el('section', 'kachel spalte', null, [
    kopf,
    feld,
    start,
    el('h2', null, 'Laufende und letzte Aufgaben'),
    agent.aufgaben.length ? el('div', 'stapel', null, agent.aufgaben.map(aufgabeKarte)) : el('p', 'leise', 'Noch keine Aufgaben.'),
  ])
}

function zeigeAgenten(agenten) {
  return [el('div', 'drei-spalten', null, AGENTEN.map((id) => agentSpalte(id, agenten[id])))]
}

// ---------- Gehirn (Netz) ----------

// Verteilt die Punkte so, dass verbundene Notizen nah beieinander liegen.
function ordneNetz(knoten, kanten, breite, hoehe) {
  const n = knoten.length
  knoten.forEach((k, i) => {
    const winkel = (2 * Math.PI * i) / Math.max(n, 1)
    k.x = breite / 2 + Math.cos(winkel) * breite * 0.3
    k.y = hoehe / 2 + Math.sin(winkel) * hoehe * 0.3
  })
  const ideal = Math.sqrt((breite * hoehe) / Math.max(n, 1)) * 0.75
  for (let runde = 0; runde < 300; runde++) {
    const waerme = 30 * (1 - runde / 300) + 0.5
    for (const k of knoten) { k.dx = 0; k.dy = 0 }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = knoten[i], b = knoten[j]
        const x = a.x - b.x, y = a.y - b.y
        const d = Math.max(Math.hypot(x, y), 1)
        const kraft = (ideal * ideal) / d
        a.dx += (x / d) * kraft; a.dy += (y / d) * kraft
        b.dx -= (x / d) * kraft; b.dy -= (y / d) * kraft
      }
    }
    for (const [a, b] of kanten) {
      const x = a.x - b.x, y = a.y - b.y
      const d = Math.max(Math.hypot(x, y), 1)
      const kraft = (d * d) / ideal
      a.dx -= (x / d) * kraft; a.dy -= (y / d) * kraft
      b.dx += (x / d) * kraft; b.dy += (y / d) * kraft
    }
    for (const k of knoten) {
      k.dx += (breite / 2 - k.x) * 0.05
      k.dy += (hoehe / 2 - k.y) * 0.05
      const d = Math.max(Math.hypot(k.dx, k.dy), 1)
      k.x = Math.min(breite - 70, Math.max(70, k.x + (k.dx / d) * Math.min(d, waerme)))
      k.y = Math.min(hoehe - 40, Math.max(30, k.y + (k.dy / d) * Math.min(d, waerme)))
    }
  }
}

function waehleNotiz(name) {
  gewaehlteNotiz = name
  gezeichnet = ''
  zeichne()
}

function zeichneNetz(notizen) {
  const BREITE = 900, HOEHE = 520
  const nachName = new Map(notizen.map((n) => [n.name, { name: n.name, vorhanden: true, grad: 0 }]))
  const kanten = []
  const gesehen = new Set()
  for (const n of notizen) {
    for (const ziel of n.verweise) {
      if (ziel === n.name) continue
      if (!nachName.has(ziel)) nachName.set(ziel, { name: ziel, vorhanden: false, grad: 0 })
      const schluessel = [n.name, ziel].sort().join('\u0000')
      if (gesehen.has(schluessel)) continue
      gesehen.add(schluessel)
      const a = nachName.get(n.name), b = nachName.get(ziel)
      a.grad++; b.grad++
      kanten.push([a, b])
    }
  }
  const knoten = [...nachName.values()]
  ordneNetz(knoten, kanten, BREITE, HOEHE)

  const bild = svg('svg', { viewBox: `0 0 ${BREITE} ${HOEHE}`, class: 'netz', role: 'group', 'aria-label': 'Netz der Notizen' })
  for (const [a, b] of kanten) {
    const aktiv = gewaehlteNotiz && (a.name === gewaehlteNotiz || b.name === gewaehlteNotiz)
    bild.append(svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'kante' + (aktiv ? ' aktiv' : '') }))
  }
  for (const k of knoten) {
    const klasse = 'knoten' + (k.vorhanden ? '' : ' fehlt') + (k.name === gewaehlteNotiz ? ' gewaehlt' : '')
    const titel = svg('title')
    titel.textContent = k.vorhanden ? `${k.name} – ${k.grad} Verweise` : `${k.name} – diese Notiz gibt es noch nicht`
    const beschriftung = svg('text', { x: k.x, y: k.y + 24 + Math.min(k.grad, 6), 'text-anchor': 'middle', class: 'knoten-text' })
    beschriftung.textContent = k.name
    const gruppe = svg('g', { class: klasse }, [
      svg('circle', { cx: k.x, cy: k.y, r: 22, class: 'treffer' }), // größere Klickfläche
      svg('circle', { cx: k.x, cy: k.y, r: 8 + Math.min(k.grad, 6), class: 'punkt-netz' }),
      beschriftung,
      titel,
    ])
    if (k.vorhanden) {
      gruppe.setAttribute('tabindex', '0')
      gruppe.setAttribute('role', 'button')
      gruppe.dataset.merke = 'knoten-' + k.name
      gruppe.addEventListener('click', () => waehleNotiz(k.name))
      gruppe.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); waehleNotiz(k.name) }
      })
    }
    bild.append(gruppe)
  }
  return bild
}

// Zeigt den Text einer Notiz; [[Verweise]] werden anklickbar.
function notizText(notiz, namen) {
  const p = el('div', 'notiz-text')
  const teile = notiz.text.split(/(\[\[[^\]\n]+\]\])/)
  for (const teil of teile) {
    const treffer = teil.match(/^\[\[([^\]|#]+)/)
    const ziel = treffer && treffer[1].trim()
    if (ziel && namen.has(ziel)) {
      const k = knopf(ziel, 'verweis', () => waehleNotiz(ziel))
      p.append(k)
    } else {
      p.append(document.createTextNode(teil))
    }
  }
  return p
}

function zeigeGehirn(notizen) {
  if (!notizen.length) return [leer('Noch keine Notizen. Lege eine .md-Datei im Ordner gehirn/ ab.')]
  const namen = new Set(notizen.map((n) => n.name))
  if (!namen.has(gewaehlteNotiz)) gewaehlteNotiz = null
  const notiz = notizen.find((n) => n.name === gewaehlteNotiz)
  return [
    el('div', 'kachel', null, [
      zeichneNetz(notizen),
      el('div', 'leise', 'Gefüllter Punkt: Notiz. Gestrichelter Punkt: Verweis auf eine Notiz, die es noch nicht gibt. Größere Punkte haben mehr Verweise. Klick auf einen Punkt zeigt die Notiz.'),
    ]),
    notiz
      ? el('div', 'kachel notiz', null, [el('div', 'name gross', notiz.name), notizText(notiz, namen)])
      : null,
    el('h2', null, 'Alle Notizen'),
    el('ul', 'liste', null, notizen.map((n) =>
      el('li', null, null, [
        knopf(n.name, 'verweis breit', () => waehleNotiz(n.name)),
        el('span', 'leise', n.steckbrief[0] || ''),
      ])
    )),
  ]
}

// ---------- Nacht (Vorschläge) ----------

function vorschlagKarte(v) {
  const veraltet = v.aenderungen.some((a) => a.veraltet)
  const zeilen = v.aenderungen.map((a) => {
    const was = a.aktion === 'loeschen' ? 'Löscht' : a.bisher === null ? 'Legt neu an' : 'Ändert'
    return el('div', 'aenderung', null, [
      el('div', 'name', `${was}: ${a.datei}`),
      a.inhalt !== null ? aufklappbar(`neu-${v.id}-${a.datei}`, 'Neuer Text', a.inhalt) : null,
      a.bisher !== null ? aufklappbar(`alt-${v.id}-${a.datei}`, 'Bisheriger Text', a.bisher) : null,
    ])
  })
  const uebernehmen = knopf('Übernehmen', 'haupt', () => sende('/api/vorschlag', { id: v.id, aktion: 'uebernehmen' }))
  uebernehmen.disabled = veraltet
  return el('div', 'kachel karte', null, [
    el('div', 'kopfzeile', null, [el('span', 'name', v.titel), marke(ART_NAME[v.art] || v.art, 'blau')]),
    el('div', null, v.begruendung),
    el('div', 'leise', 'Vorgeschlagen: ' + zeit(v.erstellt)),
    ...zeilen,
    veraltet ? el('div', 'warnung', 'Die Notiz wurde seit dem Vorschlag geändert. Übernehmen ist deshalb gesperrt – bitte verwerfen.') : null,
    el('div', 'knopfzeile', null, [
      uebernehmen,
      knopf('Verwerfen', '', () => sende('/api/vorschlag', { id: v.id, aktion: 'verwerfen' })),
    ]),
  ])
}

function zeigeNacht([vorschlaege, nacht]) {
  const zeitplan = {
    an: ['Zeitplan ist an: jede Nacht um 3:00 Uhr', 'gruen'],
    aus: ['Zeitplan ist aus', 'grau'],
    unbekannt: ['Zeitplan: nicht feststellbar', 'grau'],
  }[nacht.zeitplan] || ['Zeitplan: unbekannt', 'grau']
  return [
    el('div', 'kachel', null, [
      marke(zeitplan[0], zeitplan[1]),
      el('div', 'leise abstand', 'Ein- und ausschalten im Terminal: node agentic-os/zeitplan.mjs an  ·  node agentic-os/zeitplan.mjs aus'),
    ]),
    el('h2', null, 'Vorschläge'),
    vorschlaege.length
      ? el('div', 'stapel', null, vorschlaege.map(vorschlagKarte))
      : leer('Keine offenen Vorschläge.'),
    el('h2', null, 'Protokoll des Nachtlaufs'),
    nacht.protokoll.length
      ? el('ul', 'liste', null, [...nacht.protokoll].reverse().map((zeile) => {
          const i = zeile.indexOf(' ')
          return el('li', null, null, [el('span', 'zeit', zeit(zeile.slice(0, i))), el('span', null, zeile.slice(i + 1))])
        }))
      : leer('Der Nachtlauf ist noch nie gelaufen.'),
  ]
}

// ---------- Limits ----------

function zeichneVerlauf(punkte, stunden, titel) {
  const B = 600, H = 190, L = 40, R = 12, O = 12, U = 26
  const jetzt = Date.now()
  const von = jetzt - stunden * 3600 * 1000
  const x = (t) => L + ((t - von) / (jetzt - von)) * (B - L - R)
  const y = (w) => O + (1 - Math.min(Math.max(w, 0), 100) / 100) * (H - O - U)

  const bild = svg('svg', { viewBox: `0 0 ${B} ${H}`, class: 'verlauf', role: 'img', 'aria-label': titel })
  for (const w of [0, 50, WARN_AB, 100]) {
    if (w !== WARN_AB) bild.append(svg('line', { x1: L, x2: B - R, y1: y(w), y2: y(w), class: 'gitter' }))
    const t = svg('text', { x: L - 6, y: y(w) + 4, 'text-anchor': 'end', class: 'achse' })
    t.textContent = w + ' %'
    bild.append(t)
  }
  bild.append(svg('line', { x1: L, x2: B - R, y1: y(WARN_AB), y2: y(WARN_AB), class: 'schwelle' }))
  const links = svg('text', { x: L, y: H - 7, class: 'achse' })
  links.textContent = stunden === 24 ? 'vor 24 Stunden' : 'vor 7 Tagen'
  const rechts = svg('text', { x: B - R, y: H - 7, 'text-anchor': 'end', class: 'achse' })
  rechts.textContent = 'jetzt'
  bild.append(links, rechts)

  if (punkte.length) {
    const weg = punkte.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.w).toFixed(1)}`).join(' ')
    bild.append(svg('path', { d: weg, class: 'linie' }))
    const letzter = punkte[punkte.length - 1]
    bild.append(svg('circle', { cx: x(letzter.t), cy: y(letzter.w), r: 4, class: 'linie-punkt' }))
  }

  // Zeiger: Fadenkreuz und Wert beim Darüberfahren.
  const faden = svg('line', { y1: O, y2: H - U, class: 'faden versteckt' })
  const griff = svg('circle', { r: 5, class: 'linie-punkt versteckt' })
  const flaeche = svg('rect', { x: L, y: O, width: B - L - R, height: H - O - U, class: 'fang' })
  bild.append(faden, griff, flaeche)
  const tipp = el('div', 'tipp versteckt')
  const huelle = el('div', 'verlauf-huelle', null, [bild, tipp])

  function zeige(ereignis) {
    if (!punkte.length) return
    const rahmen = bild.getBoundingClientRect()
    const t = von + (((ereignis.clientX - rahmen.left) / rahmen.width) * B - L) / (B - L - R) * (jetzt - von)
    let naechster = punkte[0]
    for (const p of punkte) if (Math.abs(p.t - t) < Math.abs(naechster.t - t)) naechster = p
    faden.setAttribute('x1', x(naechster.t)); faden.setAttribute('x2', x(naechster.t))
    griff.setAttribute('cx', x(naechster.t)); griff.setAttribute('cy', y(naechster.w))
    tipp.textContent = `${zeit(new Date(naechster.t).toISOString())} · ${Math.round(naechster.w)} %`
    const anteil = x(naechster.t) / B
    tipp.style.left = anteil * 100 + '%'
    tipp.style.transform = `translateX(${anteil > 0.7 ? '-105%' : '8px'})`
    for (const e of [faden, griff, tipp]) e.classList.remove('versteckt')
  }
  flaeche.addEventListener('pointermove', zeige)
  flaeche.addEventListener('pointerdown', zeige)
  flaeche.addEventListener('pointerleave', () => {
    for (const e of [faden, griff, tipp]) e.classList.add('versteckt')
  })
  return huelle
}

function limitAnzeige(titel, erklaerung, feld, stunden, limits) {
  const von = Date.now() - stunden * 3600 * 1000
  const punkte = limits.verlauf
    .filter((e) => e[feld] !== null && Date.parse(e.zeit) >= von)
    .map((e) => ({ t: Date.parse(e.zeit), w: e[feld] }))
  const letzter = [...limits.verlauf].reverse().find((e) => e[feld] !== null)
  if (!letzter) {
    return el('section', 'kachel', null, [el('div', 'name gross', titel), el('p', 'leise', 'Noch kein Wert gemessen.')])
  }
  const wert = letzter[feld]
  const hoch = wert >= WARN_AB
  const breite = Math.min(Math.max(wert, 0), 100)
  const balken = svg('svg', { viewBox: '0 0 100 6', preserveAspectRatio: 'none', class: 'balken', role: 'img', 'aria-label': `${Math.round(wert)} Prozent verbraucht` }, [
    svg('rect', { x: 0, y: 0, width: 100, height: 6, rx: 3, class: 'balken-grund' }),
    svg('rect', { x: 0, y: 0, width: breite, height: 6, rx: 3, class: 'balken-wert' + (hoch ? ' hoch' : '') }),
    svg('rect', { x: WARN_AB - 0.25, y: 0, width: 0.5, height: 6, class: 'balken-strich' }),
  ])
  return el('section', 'kachel' + (hoch ? ' kachel-hoch' : ''), null, [
    el('div', 'kopfzeile', null, [
      el('span', 'name gross', titel),
      hoch ? marke(`⚠ hoch – über ${WARN_AB} %`, 'gelb') : marke('im grünen Bereich', 'gruen'),
    ]),
    el('div', 'zahl', Math.round(wert) + ' %'),
    balken,
    el('div', 'leise', `${erklaerung} · zuletzt gemessen ${zeit(letzter.zeit)}`),
    el('h2', null, stunden === 24 ? 'Verlauf der letzten 24 Stunden' : 'Verlauf der letzten 7 Tage'),
    zeichneVerlauf(punkte, stunden, `Verlauf ${titel}`),
  ])
}

function zeigeLimits(limits) {
  const teile = []
  if (!limits.verlauf.length) {
    teile.push(leer(
      'Noch keine Werte. Die Statuszeile von Claude Code liefert sie. Einrichten im Terminal: ' +
      'node agentic-os/statuszeile-einrichten.mjs – das Skript zeigt dir vorher, was es ändert. ' +
      'Werte gibt es nur mit Claude-Abo und erst nach der ersten Antwort einer Sitzung.'
    ))
  }
  teile.push(el('div', 'zwei-spalten', null, [
    limitAnzeige('Sitzung', '5-Stunden-Fenster', 'sitzung', 24, limits),
    limitAnzeige('Woche', '7-Tage-Fenster', 'woche', 168, limits),
  ]))
  return teile
}

// ---------- Zeichnen und Laden ----------

function aktuelleSeite() {
  const name = location.hash.slice(1)
  return Object.hasOwn(SEITEN, name) ? name : 'cockpit'
}

function zeichne() {
  const name = aktuelleSeite()
  const [titel, untertitel, waehle, zeige] = SEITEN[name]
  document.getElementById('titel').textContent = titel
  document.getElementById('untertitel').textContent = untertitel
  for (const a of document.querySelectorAll('#menue a')) {
    a.classList.toggle('aktiv', a.getAttribute('href') === '#' + name)
  }
  if (!stand) return

  // Nur neu zeichnen, wenn sich für diese Seite etwas geändert hat –
  // sonst würden Eingaben und aufgeklappte Bereiche gestört.
  const daten = waehle(stand)
  const abdruck = name + JSON.stringify([daten, stand.hinweise, meldung])
  if (abdruck === gezeichnet) return
  gezeichnet = abdruck

  const inhalt = document.getElementById('inhalt')
  const offen = [...inhalt.querySelectorAll('details[open]')].map((d) => d.dataset.merke)
  const fokus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.merke : null
  const auswahl = fokus && document.activeElement.selectionStart !== undefined
    ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null

  document.getElementById('hinweise').replaceChildren(
    ...(meldung ? [el('div', 'warnung', meldung)] : []),
    ...stand.hinweise.map((h) => el('div', 'warnung', 'Problem beim Lesen – ' + h))
  )
  inhalt.replaceChildren(...zeige(daten).filter(Boolean))

  for (const d of inhalt.querySelectorAll('details')) if (offen.includes(d.dataset.merke)) d.open = true
  if (fokus) {
    const ziel = [...inhalt.querySelectorAll('[data-merke]')].find((e) => e.dataset.merke === fokus)
    if (ziel) {
      ziel.focus()
      if (auswahl && ziel.setSelectionRange) ziel.setSelectionRange(auswahl[0], auswahl[1])
    }
  }
}

async function lade() {
  const punkt = document.getElementById('verbindung')
  const text = document.getElementById('verbindungstext')
  try {
    const antwort = await fetch('/api/stand', { cache: 'no-store' })
    if (antwort.status === 401) {
      punkt.className = 'punkt rot'
      text.textContent = 'kein Zugang'
      meldung = 'Kein Zugang. Bitte öffne die Adresse aus dem Terminal (mit Schlüssel).'
      return
    }
    if (!antwort.ok) throw new Error('Status ' + antwort.status)
    stand = await antwort.json()
    punkt.className = 'punkt gruen'
    text.textContent = 'verbunden'
  } catch {
    punkt.className = 'punkt rot'
    text.textContent = 'Server gestoppt'
    return
  }
  zeichne()
}

window.addEventListener('hashchange', () => {
  meldung = ''
  zeichne()
})
zeichne()
lade()
setInterval(lade, 5000)
