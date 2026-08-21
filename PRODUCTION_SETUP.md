# 🚀 LeadPilot Production Setup & Deployment Manual

This guide walks you through deploying **LeadPilot** to production with live Firebase Firestore, Groq AI (Llama 3.3 70B), and Meta WhatsApp Cloud API.

---

## 🏗️ Architecture Overview

- **Frontend & API**: Next.js 14 App Router (Deployed on Vercel or Node.js)
- **Database**: Google Cloud Firestore (Dual-mode: connects to live Firestore when credentials exist; falls back to in-memory store in demo mode)
- **LLM Engine**: Groq SDK running `llama-3.3-70b-versatile` for real-time lead qualification, custom instruction enforcement, and instant property matching
- **Messaging**: Meta Graph API v18.0 (WhatsApp Cloud API) & Facebook Lead Ads Webhook

---

## 📋 Step-by-Step Production Checklist

### 1. Database Setup (Google Cloud Firestore)
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g. `leadpilot-crm`).
2. In the left sidebar, click **Firestore Database** -> **Create Database** (Select **Production Mode** and your preferred region, e.g. `asia-south1` for Mumbai).
3. Go to **Project Settings** (gear icon) -> **Service Accounts**.
4. Click **Generate New Private Key** and download the JSON file.
5. Extract these 3 fields:
   - `project_id` -> Set as `FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `client_email` -> Set as `FIREBASE_CLIENT_EMAIL`
   - `private_key` -> Set as `FIREBASE_PRIVATE_KEY` (ensure `\n` line breaks are preserved).

---

### 2. AI Engine (Groq Cloud)
1. Sign up at [Groq Console](https://console.groq.com/).
2. Navigate to **API Keys** -> Click **Create API Key**.
3. Copy the key (starts with `gsk_...`).
4. Set as `GROQ_API_KEY`.

---

### 3. Meta WhatsApp Cloud API
1. Visit [Meta for Developers](https://developers.facebook.com/) and create a Business App.
2. Under **Add Products to Your App**, add **WhatsApp**.
3. Under **WhatsApp** -> **API Setup**:
   - Copy the **Temporary Access Token** (or generate a permanent System User Token via Meta Business Suite) -> Set as `WHATSAPP_API_TOKEN`.
   - Copy the **Phone number ID** -> Set as `WHATSAPP_PHONE_NUMBER_ID`.
4. Under **WhatsApp** -> **Configuration**:
   - **Callback URL**: `https://your-domain.vercel.app/api/whatsapp/webhook`
   - **Verify Token**: `leadpilot_webhook_token` (matches `WHATSAPP_VERIFY_TOKEN`).
   - Subscribe to the `messages` webhook field.

---

### 4. Facebook Lead Ads Webhook (Optional for Meta Ads)
1. In Meta Developer App -> **Webhooks** -> Select **Page** from dropdown.
2. **Callback URL**: `https://your-domain.vercel.app/api/integrations/facebook`
3. **Verify Token**: `leadpilot_webhook_token`
4. Subscribe to the `leadgen` event.
5. In App Settings -> Basic, copy your **App Secret** -> Set as `FACEBOOK_APP_SECRET`.

---

### 5. Deployment to Vercel
1. Push your code to GitHub / GitLab / Bitbucket.
2. In [Vercel](https://vercel.com/), click **Add New Project** and import the repository.
3. In the **Environment Variables** section, copy the variables from `.env.local.example` and paste your live keys.
4. Click **Deploy**.
5. Once deployed, open `/api/health` to verify all services report `connected_production` and `ready: true`.

---

## 🔍 System Diagnostics Endpoint

Hit `https://your-domain.vercel.app/api/health` to confirm the backend health status:
```json
{
  "status": "healthy",
  "productionReady": true,
  "services": {
    "database": {
      "status": "connected_production",
      "provider": "Google Cloud Firestore",
      "ready": true
    },
    "llmEngine": {
      "status": "active",
      "model": "llama-3.3-70b-versatile via Groq",
      "ready": true
    },
    "whatsappCloudApi": {
      "status": "configured",
      "ready": true
    }
  }
}
```
