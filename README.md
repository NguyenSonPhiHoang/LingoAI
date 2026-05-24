<div align="center">
  <img src="public/logo.png" alt="LingoAI Logo" width="400" />

  <h3>🤖 AI-Powered Personalized English Learning Platform</h3>

  <p>
    <strong>LingoAI</strong> uses Generative AI to create personalized English lessons, interactive practice exercises, and intelligent feedback — all tailored to each learner's goals and proficiency level.
  </p>

  <p>
    <a href="https://lingo.fitlhu.com">🌐 Live Demo</a> •
    <a href="#-features">✨ Features</a> •
    <a href="#-tech-stack">🛠 Tech Stack</a> •
    <a href="#-getting-started">🚀 Getting Started</a> •
    <a href="docs/HUONG_DAN_SU_DUNG.md">📖 User Guide (VN)</a>
  </p>

  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
    <img alt="Genkit" src="https://img.shields.io/badge/Firebase_Genkit-1.14-orange?logo=firebase" />
    <img alt="Gemini" src="https://img.shields.io/badge/Gemini_AI-2.0-4285F4?logo=google" />
    <img alt="SQL Server" src="https://img.shields.io/badge/SQL_Server-2022-red?logo=microsoftsqlserver" />
    <img alt="License" src="https://img.shields.io/badge/License-MIT-green" />
  </p>
</div>

---

## 📋 Overview

LingoAI is a full-stack web application that leverages **Google Gemini AI** through **Firebase Genkit** to deliver a deeply personalized English learning experience. Unlike traditional platforms, LingoAI generates lessons, exercises, and feedback **on-demand** based on each user's proficiency, goals, and interests.

> **🎓 Graduation Thesis Project** — Faculty of Information Technology, Lac Hong University

## ✨ Features

### 🎯 Core Learning
| Feature | Description |
|---------|-------------|
| **AI Lesson Generator** | Dynamically creates personalized lessons across 5 skills (Listening, Speaking, Reading, Writing, Pronunciation) |
| **Smart Placement Test** | AI-generated assessment to determine proficiency level |
| **Interactive Practice** | Skill-specific exercises with real-time AI feedback |
| **AI Storybook** | Generates bilingual or code-mixed stories for immersive reading |

### 📚 Vocabulary & Review
| Feature | Description |
|---------|-------------|
| **Smart Vocabulary** | AI auto-fills definitions, IPA, examples, and synonyms from a word or phrase |
| **Image Extraction** | OCR-powered vocabulary extraction from images |
| **Spaced Review** | Matching & fill-in-the-blank exercises for favorited words |
| **Topic Grouping** | AI automatically categorizes vocabulary by topic |

### 📊 Progress & Tools
| Feature | Description |
|---------|-------------|
| **Learning Dashboard** | Visual progress tracking across all skills |
| **Personal Library** | Save articles, YouTube links, and handwritten notes |
| **VSTEP Preparation** | Specialized modules for VSTEP exam readiness |
| **Gamification** | XP system, streaks, and leaderboards |

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router, Server Actions)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3 + Radix UI primitives
- **Charts:** Recharts
- **Canvas:** react-sketch-canvas (handwriting notes)

### AI / Backend Services
- **AI Orchestration:** Firebase Genkit 1.14
- **LLM:** Google Gemini 2.0 (via `@genkit-ai/googleai`)
- **TTS:** Google Cloud Text-to-Speech

### Backend API
- **Runtime:** Node.js + Express
- **Database:** Microsoft SQL Server (via `mssql`)
- **Auth:** JWT + bcrypt
- **File Upload:** Multer

### Deployment
- **Frontend:** Firebase App Hosting
- **Backend:** VPS with PM2
- **Domain:** [lingo.fitlhu.com](https://lingo.fitlhu.com)

## 📁 Project Structure

```
LingoAI/
├── src/
│   ├── ai/                    # Genkit AI flows & configuration
│   │   ├── flows/             # 20+ AI generation flows
│   │   ├── genkit.ts          # Genkit initialization
│   │   └── model-selector.ts  # Dynamic model selection
│   ├── app/                   # Next.js App Router pages
│   │   ├── grammar/           # Grammar exercises
│   │   ├── library/           # Personal library
│   │   ├── storybook/         # AI Storybook
│   │   ├── vtep/              # VSTEP teacher portal
│   │   ├── vtep-student/      # VSTEP student portal
│   │   └── page.tsx           # Main dashboard
│   ├── components/            # Reusable UI components
│   ├── context/               # React context providers
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions
│   └── services/              # API service layer
├── backend/
│   └── src/
│       ├── controllers/       # Request handlers
│       ├── models/            # Data models
│       ├── repositories/      # Database queries
│       ├── routes/            # Express routes
│       ├── services/          # Business logic
│       └── middleware/        # Auth & validation
├── public/                    # Static assets & logos
├── docs/                      # Documentation
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **SQL Server** 2019+
- **Google AI API Key** ([Get one here](https://aistudio.google.com/apikey))

### 1. Clone & Install

```bash
git clone https://github.com/NguyenSonPhiHoang/LingoAI.git
cd LingoAI
git checkout dev

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Environment Setup

Create `.env` in the project root:

```env
# Google AI
GOOGLE_GENAI_API_KEY=your_google_ai_key

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Create `backend/.env`:

```env
# Database
DB_SERVER=localhost
DB_NAME=LingoAI
DB_USER=sa
DB_PASSWORD=your_password

# Auth
JWT_SECRET=your_jwt_secret
```

### 3. Run Development Servers

```bash
# Terminal 1 — Frontend (Next.js)
npm run dev

# Terminal 2 — Backend (Express)
cd backend && npm run dev
```

The app will be available at **http://localhost:3000**

## 👥 Authors

- **Nguyễn Sơn Phi Hoàng** — Developer
- **Chu Ngọc Sơn** — Developer
- **Thầy Nguyễn Minh Phúc** —  Thesis Advisor
- **Lac Hong University** — Faculty of Information Technology

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ and AI at Lac Hong University</sub>
</div>
