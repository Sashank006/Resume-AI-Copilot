# 💼 AI Resume + Job Copilot

A full-stack AI-powered web app to help you generate, edit, score, and track job-ready resumes — plus search for real jobs and apply directly.

---

## 🚀 Features

- ✅ Resume Upload (PDF parsing & autofill)
- ✅ AI Resume Generation using LLM
- ✅ ATS Scoring + Feedback
- ✅ Resume Editing with Download (PDF, TXT)
- ✅ Versioning with Tags + Rename
- ✅ Real-time Job Search via API (title, location, type)
- ✅ Job Matching Score + Apply Tracking
- ✅ Cover Letter Autofill + Manual Writing
- ✅ Mobile Responsive + Dark Mode
- ✅ Toasts, Loading Spinners, Favicon, Footer

---

## 🖥️ Tech Stack

**Frontend**  
- React + Tailwind CSS  
- LocalStorage for resume state  
- Toast notifications for UX polish

**Backend**  
- Flask API (Ollama LLM for resume generation/scoring)  
- MongoDB Atlas for user + resume storage  
- PDF resume parsing + text processing

**Integrations**  
- JSearch (RapidAPI) for real-time job listings  
- Resume match scoring AI-calculated

---

## 🛠️ Running Locally

### 1. Clone the repo

```bash
git clone https://github.com/Sashank006/Resuume-AI-Copilot.git
cd your-repo-name
```
```bash
## 2. Install frontend dependencies
npm install
npm start
```
```bash
## 3. Backend Flask
cd backend
pip install -r requirements.txt
python app.py
```


🌐 Deployment Notes
Move API keys to .env

Proxy your RapidAPI key in backend

Deploy frontend via Vercel/Netlify

Deploy backend via Render/Railway

Use MongoDB Atlas (already done ✅)

The AI backend is currently inactive because my free credits expired. The full code and architecture are implemented, and the system can be re-activated instantly with valid API tokens

## 🧠 Built by Sashank R.K.
For Contact: [LinkedIn](https://www.linkedin.com/in/sashankreddyk) | [GitHub](https://github.com/Sashank006)


