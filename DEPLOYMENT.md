# Praxis Portal – Komplette Azure-Deployment-Anleitung

## Was ist eingerichtet
- **Frontend**: React + TypeScript + Vite, Azure Entra ID (MSAL) Login/SSO mit MFA-fähig.
- **Backend**: Node.js + Fastify API (`/api/*`) mit Platzhaltern für Dokumente/Secrets.
- **Deployment**: GitHub Actions Workflow für Azure Static Web Apps (automatisch bei Push auf `main`).
- **Security**: HSTS, CSP-ready, Secrets via Key Vault (Produktions-Setup).

---

## 1) Azure Entra ID (Identity/SSO) einrichten

### App Registration anlegen
1. Im [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. **Name**: `Praxis Portal` (oder beliebig).
3. **Supported account types**: „Accounts in this organizational directory only" (Single tenant).
4. **Redirect URI**: Platform **Single-page application (SPA)**; URI `http://localhost:5173` (für Dev).
5. Klick **Register**.

### Client ID & Tenant ID notieren
- Nach Registrierung siehst du **Application (client) ID** und **Directory (tenant) ID** → kopieren.

### Redirect URI für Produktion hinzufügen
- Unter **Authentication** → **Add URI** → Trage deine Azure-Static-Web-Apps-URL ein (z.B. `https://<deine-app>.azurestaticapps.net`).
- Aktiviere **ID tokens** unter „Implicit grant and hybrid flows" (falls nötig für Logout).

### MFA & Conditional Access aktivieren
- **Entra ID** → **Security** → **Conditional Access** → **New policy**:
  - Nutzer: Alle/Gruppe deiner Praxis-Mitarbeiter.
  - Cloud-Apps: deine App-Registration auswählen.
  - Grant: MFA erforderlich.
- Alternativ: User-Ebene MFA erzwingen (Entra ID → Users → MFA settings).

---

## 2) Azure Static Web Apps erstellen

### Im Azure Portal
1. **Create a resource** → suche „Static Web Apps" → **Create**.
2. **Basics**:
   - Subscription/Resource Group wählen.
   - Name: `praxis-portal` (wird Teil der URL).
   - Region: **West Europe** oder **North Europe** (DSGVO-konform).
   - Plan: **Free** (für Test) oder **Standard** (Custom Domain, mehr Bandbreite).
3. **Deployment Details**:
   - Source: **GitHub** (authorisiere dein Konto).
   - Organization/Repo wählen: dein GitHub-Repo mit diesem Code.
   - Branch: `main`.
   - Build Presets: **Custom**.
   - App location: `/` (Root).
   - Api location: `api`.
   - Output location: `dist`.
4. Klick **Review + create** → **Create**.

### GitHub Secrets hinterlegen
Azure erstellt automatisch ein Secret `AZURE_STATIC_WEB_APPS_API_TOKEN` im Repo. Du musst noch hinzufügen:
1. GitHub → dein Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - `VITE_AAD_TENANT_ID`: Deine Tenant ID aus Schritt 1.
   - `VITE_AAD_CLIENT_ID`: Deine Client ID aus Schritt 1.
   - `VITE_API_BASE_URL`: Leer lassen (API läuft unter `/api` auf derselben Domain) oder `https://<deine-app>.azurestaticapps.net` falls explizit nötig.

### Deploy auslösen
- Push auf `main` Branch → GitHub Action startet automatisch → nach ~2-3 Min. ist deine App live unter `https://<name>.azurestaticapps.net`.

---

## 3) Lokal testen (Dev)

### Frontend
1. `.env` im Root anlegen (nicht committen!):
   ```
   VITE_AAD_TENANT_ID=<deine-tenant-id>
   VITE_AAD_CLIENT_ID=<deine-client-id>
   VITE_API_BASE_URL=http://localhost:3000
   ```
2. `npm install` (wenn nicht schon geschehen).
3. `npm run dev` → öffne `http://localhost:5173` → Login-Flow testet gegen Entra ID.

### Backend (API)
1. `cd api && npm install`.
2. `cp .env.example .env` → Anpassungen (Port, CORS).
3. `npm run dev` (läuft auf `http://localhost:3000`).
4. Test: `curl http://localhost:3000/api/health`.

---

## 4) Produktions-Features (Security & Compliance)

### a) Key Vault für Secrets (empfohlen)
- Azure Portal → **Key Vaults** → **Create** (Region: West Europe).
- Füge Secrets hinzu (z.B. Storage-Keys, DB-Passwörter).
- In deinem API: SDK `@azure/keyvault-secrets` + Managed Identity aktivieren (Static Web Apps Standard Plan).
- Keine Passwörter im Code/Repo!

### b) Azure Blob Storage für Dokumente
- Azure Portal → **Storage accounts** → **Create** (Region: West Europe, Redundancy: LRS/GRS).
- Container anlegen (Private Access).
- API-Code: `@azure/storage-blob`, generiere SAS-URLs mit kurzer TTL für Downloads.
- Verschlüsselung at-rest ist standardmäßig aktiviert.

### c) Logging & Monitoring
- Static Web Apps → **Application Insights** aktivieren.
- API-Fehler/Requests loggen → Alerts bei Anomalien.

### d) Custom Domain & TLS
- Static Web Apps → **Custom domains** → eigene Domain hinterlegen (z.B. `portal.praxisdomain.de`).
- Azure managed TLS-Zertifikat (automatisch).

### e) Backup & Disaster Recovery
- Blob Storage: Aktiviere Soft Delete + Versioning.
- Datenbank (falls später SQL/Cosmos): Point-in-time Restore aktivieren.
- Code: Git als Source of Truth; Static Web Apps neu erstellen dauert < 5 Min.

### f) DSGVO-Compliance
- **AV-Vertrag** (Data Processing Agreement): Azure → Compliance-Dokumente → DPA herunterladen, unterschreiben.
- **Verzeichnis der Verarbeitungstätigkeiten**: Dokumentiere Frontend/API/Blob/Key Vault als Verarbeitungen.
- **Rollen/Rechte**: Entra ID Groups für Admin/Mitarbeiter/Extern; Claims in Token auswerten.
- **Löschkonzept**: Implementiere User-Daten-Löschung per API (Blob-Objekte, DB-Zeilen).

---

## 5) Nächste Schritte & Erweiterungen

1. **Dokumente-Feature**: Blob Storage anbinden, Upload-Endpoint + SAS-Download-URLs.
2. **Secrets-Feature**: Key Vault anbinden; nur Metadaten im UI, keine echten Passwörter.
3. **E-Mail/Tools-Links**: Deep Links zu OWA/Teams, konfigurierbar per API.
4. **Rollen/Rechte**: Claims aus Entra Token auswerten (`roles`, `groups`); Role-Based Access Control in API.
5. **Audit-Logs**: Alle Downloads/Änderungen protokollieren (Cosmos/SQL + App Insights).
6. **UI-Theme**: Praxis-Branding (Logo, Farben) anpassen.
7. **Mobile**: Progressive Web App (PWA) aktivieren (Vite Plugin).

---

## Kosten-Übersicht (ca. Größenordnung für kleine Praxis)

- **Static Web Apps** (Free Tier): 0 €/Monat (100 GB Bandbreite, 0,5 GB Storage).
- **Static Web Apps** (Standard): ~8 €/Monat (Custom Domain, 100 GB Bandbreite, mehr Features).
- **Entra ID** (Free): 0 € (bis 50k MAU).
- **Key Vault**: ~0,03 €/10k Operationen + ~0,03 €/Secret/Monat → < 5 €/Monat.
- **Blob Storage** (LRS, 10 GB): ~0,20 €/Monat.
- **App Insights** (Basic): 5 GB Logs/Monat gratis, dann ~2 €/GB.
- **Gesamt**: Free-Tier-Test 0-5 €; kleine Produktion 15-30 €/Monat.

---

## Support & Fragen

- **Azure Docs**: https://learn.microsoft.com/en-us/azure/static-web-apps/
- **Entra ID/MSAL**: https://learn.microsoft.com/en-us/entra/identity-platform/
- **Key Vault**: https://learn.microsoft.com/en-us/azure/key-vault/
- **Blob Storage**: https://learn.microsoft.com/en-us/azure/storage/blobs/

Bei Fragen: Prüfe Azure Support-Plan (Developer/Standard) oder Community-Foren.
