# Praxis Portal – Azure-ready React UI

Frontend mit React + TypeScript + Vite, vorbereitet für Azure Entra ID (MSAL) und eigenes Backend.

## Setup lokal
1) Node 20+ installieren.
2) Abhängigkeiten: `npm install`.
3) `.env` anlegen (siehe `.env.example`).
4) Dev-Server: `npm run dev`.

## .env.example Felder
```
VITE_AAD_TENANT_ID=<Azure Tenant ID>
VITE_AAD_CLIENT_ID=<App-Registration Client ID>
VITE_API_BASE_URL=<https://your-api.azurewebsites.net>
```

## Azure Identity (Entra ID)
1) App Registration anlegen (Single-Page-App), Redirect-URL: `http://localhost:5173` (für Dev), später Ihre Prod-URL.
2) Client ID und Tenant ID in `.env` eintragen.
3) In Entra ID: Nutzer/Gruppen anlegen, MFA/Conditional Access aktivieren.

## Deployment (Azure Static Web Apps oder App Service)
- Build: `npm run build` → `dist/` deployen.
- Static Web Apps: Quelle `.`; Build `npm run build`; App-Artifact `dist`.
- App Service (Linux, Node 20): App-Setting `WEBSITE_NODE_DEFAULT_VERSION=20`; Startup `npx serve -s dist` oder mit eigenes Backend per Reverse Proxy.

## Security-Hinweise
- Immer HTTPS; HSTS aktivieren.
- Secrets nie ins Repo: Key Vault nutzen.
- Für API-Aufrufe Access Token via MSAL holen (Scopes/APIs in Entra freigeben).

## Nächste Schritte
- Keycloak wird nicht benötigt; Auth läuft über Entra ID.
- Backend-API (Node/Fastify) anschließen und in `VITE_API_BASE_URL` referenzieren.
- Rollen/Claims in Entra ID definieren und im UI auswerten.
