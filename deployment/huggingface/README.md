---
title: ProctoringEngine
emoji: 🛡️
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# 🚀 Deploying Proctoring Engine to Hugging Face Spaces

This guide outlines how to host your **prebuilt hybrid proctoring backend** on Hugging Face Spaces completely **for free, with no credit card required**.

---

## 📅 Step 1: Create a Free Hugging Face Account
1. Go to [huggingface.co](https://huggingface.co/) and click **Sign Up**.
2. Complete registration. **You do NOT need to enter any payment details or credit card info!**

---

## 🛠️ Step 2: Create a New Space
1. Once logged in, go to the top right profile dropdown and click **New Space** (or go directly to [huggingface.co/new-space](https://huggingface.co/new-space)).
2. Configure the Space settings:
   - **Space Name:** `codecrux-proctoring` (or any unique name of your choice).
   - **License:** `mit` (optional).
   - **SDK:** Select **Docker** (this is critical as we use a custom Dockerfile with native C++ dependencies for OpenCV/MediaPipe!).
   - **Docker Template:** Select **Blank** (default).
   - **Space Hardware:** Select **CPU Basic (2 vCPUs, 16GB RAM) - Free** (default).
   - **Visibility:** **Public** or **Private** (we recommend **Public** to make connecting with your React app seamless, or **Private** if you want to keep the endpoints completely restricted).
3. Click **Create Space** at the bottom.

---

## 🔑 Step 3: Add Your Gemini API Key Secret
To enable the high-accuracy **Identity Lock (Same-Person face comparison)**, add your Gemini API Key securely:
1. In your newly created Space, navigate to the **Settings** tab.
2. Scroll down to the **Variables and secrets** section.
3. Click **New secret**.
4. Set the name as `GEMINI_API_KEY`.
5. Paste your Gemini API Key as the value: `AIzaSyCUuYbhnjEMNhSlOnmcMMI7GqDsiI9L5KE` (retrieve from your local `.env` if updated).
6. Click **Save**.

---

## 📤 Step 4: Upload Your Deployment Files
You can upload the files directly via the Hugging Face web interface or using Git.

### Option A: Web Interface Upload (Easiest)
1. In your Space, click the **Files** tab.
2. Click **Add file** -> **Upload files**.
3. Drag and drop the three files from your local `deployment/huggingface/` directory:
   - `app.py`
   - `requirements.txt`
   - `Dockerfile`
4. Write a commit message (e.g. `Deploy proctoring backend`) and click **Commit changes to main**.

### Option B: Git Push (Command Line)
In your terminal, navigate to the deployment directory and push directly:
```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
cd YOUR_SPACE_NAME
cp -r ../deployment/huggingface/* .
git add .
git commit -m "Deploy proctoring microservice"
git push
```

---

## 📡 Step 5: Connecting Your React App
Once the files are uploaded, Hugging Face will automatically trigger the container build. The status in the top bar will change from **Building** to **Running** (this takes about 2–3 minutes on the first build).

Once running, your Space is live!
- Get your public API endpoint. It will look like this:
  `https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space`
- Test that the backend is working by visiting:
  `https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space/health`
- Update the API endpoint URL in your React `.env` file to point to your new cloud Space!
  ```env
  REACT_APP_PROCTORING_API_URL=https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space
  ```
