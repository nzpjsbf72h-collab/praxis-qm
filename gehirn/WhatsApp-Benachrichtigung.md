# WhatsApp-Benachrichtigung

> **Steckbrief**
> - Thema: Idee – zuständige Mitarbeitende per WhatsApp benachrichtigen, wenn ein Fachgeschäft im Portal ein Problem meldet
> - Stand: 2026-11-11 – **GEPLANT, später einbauen** (ausdrücklicher Wunsch). Noch nicht gebaut. Offen: welches Portal (Praxis Portal oder ein Portal fürs Backhaus Mahl)
> - Verwandt: [[Praxis Portal]], [[Sicherheit]], [[Agenten]]

- Ablauf: Meldung im Portal → Backend speichert sie → sucht die zuständige Person (je Fachgeschäft oder Thema) → schickt eine WhatsApp über die offizielle WhatsApp-Business-Schnittstelle von Meta (Cloud API).
- Dafür braucht es keinen KI-Agenten (auch nicht Hermes). Eine feste Benachrichtigung ist sicherer und berechenbarer.
- Nachrichten, die der Betrieb von sich aus schickt, brauchen eine von Meta vorab genehmigte Vorlage mit Platzhaltern.
- Mitarbeitende müssen vorher zustimmen, Nachrichten zu bekommen (Einwilligung festhalten).
- In die Nachricht nur das Nötigste: wer meldet, Art des Problems, Link ins Portal. Keine Kunden-, Gesundheits- oder Personaldaten.
- Der Zugangsschlüssel für Meta gehört in Azure Key Vault, nie in Code, Git oder dieses Gehirn (siehe [[Sicherheit]]).
- Ausbaustufen: Knopf „Übernehme ich“ in der WhatsApp (braucht eine öffentlich erreichbare Rückmelde-Adresse), Eskalation an eine Vertretung, wenn nach X Minuten niemand reagiert, E-Mail als Ersatz.

## Antworten per WhatsApp (Idee, Stand 2026-11-11)

- Antwortet die zuständige Person, schickt Meta die Nachricht an eine öffentlich erreichbare Rückmelde-Adresse (Webhook) des Portal-Backends.
- Das Backend prüft zuerst die Signatur von Meta, dann die Absendernummer: Nur die zuständige Person darf den Stand dieser Meldung ändern.
- Zuordnung zur Meldung über die Antwort-Funktion von WhatsApp (die Antwort verweist auf die ursprüngliche Nachricht) oder über eine Meldungsnummer im Text.
- Eine KI ordnet den freien Text nur einem Stand aus einer festen Liste zu (z. B. „Techniker beauftragt“, „Erledigt“). Sie darf sonst nichts tun. Ist sie unsicher, fragt das Portal zurück.
- Das Portal bestätigt per WhatsApp, was es geändert hat, mit Möglichkeit zum Rückgängig-Machen. Jede Änderung wird mit Uhrzeit protokolliert.
- Einfachere Alternative ohne KI: Antwort-Knöpfe in der WhatsApp („Techniker angerufen“, „Erledigt“, „Brauche Hilfe“).
- Datenschutz: Bei KI-Auswertung geht der Antworttext an den KI-Anbieter; Auftragsverarbeitung klären.

## Vereinbarter Plan (2026-11-11)

1. Grundgerüst ohne echten Versand bauen, damit der Ablauf gefahrlos getestet werden kann.
2. Benachrichtigung per WhatsApp-Vorlage an die zuständige Person.
3. Antworten zuerst über Knöpfe („Techniker angerufen“, „Erledigt“, „Brauche Hilfe“).
4. Erst danach KI für freien Text – nur Auswahl aus der festen Stand-Liste.
5. Später: Vertretung bei fehlender Reaktion, E-Mail als Ersatzweg.

Vor dem Start klären: Portal, Meta-Business-Konto und eigene Nummer, Datenschutz (Meta, KI-Anbieter), Preise bei Meta.
