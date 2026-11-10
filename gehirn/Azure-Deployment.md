# Azure-Deployment

> **Steckbrief**
> - Thema: Wie das Praxis Portal online geht
> - Stand: 2026-11-10
> - Verwandt: [[Praxis Portal]], [[Sicherheit]]

- Die ausführliche Anleitung steht in `DEPLOYMENT.md` im Projektordner.
- Ziel ist Azure Static Web Apps. Ein GitHub-Actions-Workflow (`.github/workflows/`) veröffentlicht automatisch bei einem Push auf `main`.
- Build: `npm run build`, das Ergebnis liegt in `dist/`.
- Anmeldung läuft über eine App-Registrierung in Entra ID; die Adresse der fertigen Seite muss dort als Redirect-URI eingetragen sein.
- Zugangsdaten gehören in Azure Key Vault bzw. in die GitHub-Secrets, nie ins Repository (siehe [[Sicherheit]]).
