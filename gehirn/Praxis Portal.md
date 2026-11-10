# Praxis Portal

> **Steckbrief**
> - Thema: Das eigentliche Projekt in diesem Ordner – ein Web-Portal für die Praxis
> - Stand: 2026-11-10
> - Verwandt: [[Azure-Deployment]], [[Sicherheit]], [[Cockpit]]

- Oberfläche: React + TypeScript + Vite, liegt in `src/`.
- Anmeldung: Azure Entra ID über MSAL (Single-Sign-on, MFA möglich). Einstellungen in `src/authConfig.ts`, Werte kommen aus `.env` (Vorlage: `.env.example`).
- Backend: `api/` mit Node.js + Fastify. Die Endpunkte für Dokumente und Secrets sind bisher Platzhalter.
- Lokal starten: `npm install`, dann `npm run dev` (Adresse http://localhost:5173).
- Wie es online geht, steht in [[Azure-Deployment]].
