# 🔐 Setting Up GitHub OAuth Authorization for VASUKI

VASUKI supports direct **GitHub OAuth 2.0 authorization**, allowing users to click **Authorize with GitHub** to connect their account, inspect their public and private repositories, and trigger autonomous verification pipelines with zero manual token generation.

---

## 🚀 1. Register a GitHub OAuth App

1. Go to your GitHub account settings:
   - Navigate to **[GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)**.
   - Or click your profile photo in GitHub → **Settings** → **Developer Settings** (bottom of left sidebar) → **OAuth Apps**.

2. Click **New OAuth App** (or **Register a new application**).

3. Fill out the application details:
   - **Application name**: `VASUKI Autonomous Security Sentinel`
   - **Homepage URL**:
     - Local dev: `http://localhost:5173`
     - Production: `https://vasuki.dhanrajgupta.xyz` (or `https://vp.dhanrajgupta.xyz`)
   - **Application description**: `Autonomous multi-agent security collective with Docker test verification.`
   - **Authorization callback URL**:
     - Local dev: `http://localhost:5173/` (or `http://localhost:8000/api/github/oauth/callback`)
     - Production: `https://vasuki.dhanrajgupta.xyz/` (or `https://api.dhanrajgupta.xyz/api/github/oauth/callback`)
     *(Note: VASUKI supports both direct frontend callback and backend redirect callback)*

4. Click **Register application**.

---

## 🔑 2. Obtain Credentials

1. You will see your **Client ID** (e.g. `Iv1.xxxxxxxxxxxx` or `Ov23xxxxxxxx`).
2. Click **Generate a new client secret**.
3. Copy both:
   - **Client ID**
   - **Client Secret**

---

## ⚙️ 3. Configure VASUKI Backend

Add your OAuth credentials to `backend/.env`:

```env
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_OAUTH_REDIRECT_URI=
```

> **Note**: If `GITHUB_OAUTH_REDIRECT_URI` is left blank, VASUKI automatically uses `${FRONTEND_URL}/` as the callback.

### On Production (Oracle Cloud / VM):
SSH into your Oracle Cloud VM and update `/opt/vasuki/backend/.env` (or your compose `.env`):
```bash
sudo nano /opt/vasuki/backend/.env
# Add:
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
# Restart the container:
docker compose -f /opt/vasuki/ops/compose.oracle.yml restart api
```

---

## 🛡️ 4. How the Flow Works

1. **User clicks "Authorize GitHub"** in the top navigation or inspection panel.
2. The modal displays **Authorize GitHub** with a one-click button.
3. Clicking **Authorize with GitHub** opens GitHub's secure OAuth consent screen.
4. Once authorized:
   - The token is exchanged securely via VASUKI backend.
   - The modal automatically loads the authenticated user's repositories and branches.
   - Selecting any repository auto-populates the URL and branch for immediate automated scanning and testing.
5. Users can disconnect at any time with the **Disconnect** button.
