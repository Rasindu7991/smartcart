# SmartCart Deployment Guide: Railway & Vercel

This guide explains how to deploy your SmartCart repository ([https://github.com/Rasindu7991/smartcart](https://github.com/Rasindu7991/smartcart)) to **Railway** (recommended for persistence) and **Vercel** (serverless).

---

## 🚂 Option 1: Deploying on Railway (Recommended)
Railway is the best fit for the current codebase because it supports **Persistent Volumes** (disks). This prevents your database (`smartcart_db.json`) from resetting when the server restarts or rebuilds.

### Step-by-Step Instructions:

1. **Log in to Railway**:
   - Go to [Railway.app](https://railway.app/) and sign in with your GitHub account.

2. **Create a New Project**:
   - Click **New Project** in the top right.
   - Select **Deploy from GitHub repo**.
   - Choose your `smartcart` repository.

3. **Configure Volume Storage (Crucial for saving data)**:
   - Once the deployment canvas loads, click on your `smartcart` service block.
   - Go to the **Settings** tab.
   - Scroll down to the **Volumes** section and click **Add Volume**.
   - Set the **Mount Path** to: `/app/data`
   - Save the volume.

4. **Set Environment Variables**:
   - Switch to the **Variables** tab on the same service page.
   - Add a new variable:
     - **Name**: `DB_DIR`
     - **Value**: `/app/data`
   - Add another variable:
     - **Name**: `PORT`
     - **Value**: `3000`
   - Click **Save**.

5. **Expose a Public URL**:
   - Go to the **Settings** tab again.
   - Under **Networking**, click **Generate Domain** (or set a custom domain).
   - This will give you a public `https://...` link.

6. **Test Your Deployment**:
   - Click the generated URL. The app is now live, secure with HTTPS, and the camera/barcode scanner will work natively on your phone. All data will persist on your Railway volume!

---

## ⚡ Option 2: Deploying on Vercel (Serverless)
Vercel is extremely fast and 100% free, but it runs on **Serverless Functions**. Because of this, the local filesystem is **read-only and temporary**—meaning any lists you create or items you check off will be deleted every time Vercel puts the server to sleep (which happens automatically after a few minutes of inactivity).

If you want to use Vercel, you have two options:

### Path A: Use Vercel for testing (Data resets periodically)
If you just want a quick preview link to show others:
1. Go to [Vercel.com](https://vercel.com/) and sign in.
2. Click **Add New...** > **Project**.
3. Select your `smartcart` repository from GitHub.
4. Leave all settings at default (Vercel automatically detects it's a Node app) and click **Deploy**.
5. Once complete, your site is live! (But remember, data will reset when the server restarts).

### Path B: Connect to a Free Cloud Database (Production Ready)
To keep your data permanent on Vercel, you need to connect the app to a free external cloud database instead of saving to a local JSON file. 

1. **Get a free database**:
   - Create a free account at [Supabase](https://supabase.com/) or [Neon PostgreSQL](https://neon.tech/).
   - Copy your database connection string URL.
2. **Update the code**:
   - Replace the local `database.js` file functions with database queries pointing to Neon or Supabase (using the `pg` or `@supabase/supabase-js` library).
3. **Set Environment Variables in Vercel**:
   - Add your connection string URL as an environment variable in your Vercel Dashboard under **Settings > Environment Variables**.
