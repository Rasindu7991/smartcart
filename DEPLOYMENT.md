# SmartCart Deployment Guide (Render & Railway)

Since SmartCart uses a lightweight file-based database (`smartcart_db.json`), you should deploy it to a platform that supports **persistent disks** so your data is not lost when the server restarts.

Below are the step-by-step instructions to deploy to **Render** or **Railway**.

---

## 1. Push Your Code to GitHub
Before deploying, you need to push your local code to a GitHub repository.

1. In your terminal, go to the project directory:
   ```bash
   cd C:\Users\ABC\.gemini\antigravity\scratch\smartcart
   ```
2. Initialize Git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of SmartCart PWA"
   ```
3. Create a new repository on [GitHub](https://github.com/) (keep it private if you want to protect your Vision API key).
4. Link your local project to GitHub and push:
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

---

## 2. Deploying on Render (Free Tier Available)

Render is great because it has a generous free tier and supports persistent disks on their Web Services.

1. Sign up/Login to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `smartcart` repository.
4. Set the following configurations:
   * **Name**: `smartcart`
   * **Environment**: `Node`
   * **Region**: Choose the closest one to you.
   * **Branch**: `main`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
5. **Configure Persistent Disk (Crucial for data survival)**:
   * Scroll down to the **Advanced** section or go to the **Disks** tab in the sidebar after creation.
   * Click **Add Disk**.
   * **Name**: `db-disk`
   * **Mount Path**: `/opt/render/project/src/data` (We will configure the app to read/write here).
   * **Size**: `1 GB` (More than enough for thousands of grocery lists).
6. **Environment Variables**:
   * Add `PORT` = `3000`
   * Add `DB_DIR` = `/opt/render/project/src/data`
7. Click **Deploy Web Service**.

---

## 3. Deploying on Railway (Easiest Setup)

Railway has an extremely fast deployment process.

1. Sign up/Login to [Railway](https://railway.app/).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select your `smartcart` repository.
4. Once the deployment starts, click on the service block in the canvas and go to **Settings**.
5. **Add a Volume (Crucial)**:
   * Under **Volumes**, click **Add Volume**.
   * Set the **Mount Path** to `/app/data`.
6. **Add Environment Variables**:
   * Go to **Variables** tab.
   * Add `DB_DIR` = `/app/data`
7. Railway will automatically rebuild and your data will be permanently saved!
