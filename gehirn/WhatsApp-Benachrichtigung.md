# WhatsApp-Benachrichtigung

> **Steckbrief**
> - Thema: Idee – zuständige Mitarbeitende per WhatsApp benachrichtigen, wenn ein Fachgeschäft im Portal ein Problem meldet
> - Stand: 2026-11-11, nur besprochen, noch nicht gebaut; offen ist, welches Portal gemeint ist (Praxis Portal oder ein Portal fürs Backhaus Mahl)
> - Verwandt: [[Praxis Portal]], [[Sicherheit]], [[Agenten]]

- Ablauf: Meldung im Portal → Backend speichert sie → sucht die zuständige Person (je Fachgeschäft oder Thema) → schickt eine WhatsApp über die offizielle WhatsApp-Business-Schnittstelle von Meta (Cloud API).
- Dafür braucht es keinen KI-Agenten (auch nicht Hermes). Eine feste Benachrichtigung ist sicherer und berechenbarer.
- Nachrichten, die der Betrieb von sich aus schickt, brauchen eine von Meta vorab genehmigte Vorlage mit Platzhaltern.
- Mitarbeitende müssen vorher zustimmen, Nachrichten zu bekommen (Einwilligung festhalten).
- In die Nachricht nur das Nötigste: wer meldet, Art des Problems, Link ins Portal. Keine Kunden-, Gesundheits- oder Personaldaten.
- Der Zugangsschlüssel für Meta gehört in Azure Key Vault, nie in Code, Git oder dieses Gehirn (siehe [[Sicherheit]]).
- Ausbaustufen: Knopf „Übernehme ich“ in der WhatsApp (braucht eine öffentlich erreichbare Rückmelde-Adresse), Eskalation an eine Vertretung, wenn nach X Minuten niemand reagiert, E-Mail als Ersatz.
