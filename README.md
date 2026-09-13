# ⚡ NexusLife — Personal Life Management Dashboard

> **Track your habits. Manage your money. Achieve your goals. Improve your life.**

🌐 **Live Demo:** https://nexus-life-ten.vercel.app/

NexusLife is a modern personal productivity and life-management web application designed to bring multiple aspects of daily life into one centralized dashboard.

Instead of using separate applications for habits, expenses, goals, learning, journaling, and analytics, NexusLife provides a unified platform to track, analyze, and improve everyday life.

---

## 🚀 Features

### 📊 Dashboard
- Centralized overview of daily activities
- Habit progress
- Expense summaries
- Goals and milestones
- Productivity statistics
- Personalized insights

### ✅ Habit Tracking
- Create and manage daily habits
- Track completion
- Maintain streaks
- Monitor long-term consistency
- Bad-habit recovery tracking

### 💰 Expense Tracking
- Record daily expenses
- Categorize transactions
- Track spending patterns
- Set budgets
- View expense analytics
- Monitor financial progress

### 🎯 Goals & Milestones
- Create personal goals
- Break goals into milestones
- Track progress
- Monitor completion status
- Visualize long-term progress

### 📚 Learning & Study
- Maintain learning logs
- Track study sessions
- Built-in study timer
- Monitor learning progress

### 📝 Journal & Mood
- Daily journal entries
- Mood tracking
- Personal reflections
- Historical records

### 📈 Analytics
- Habit statistics
- Expense charts
- Productivity trends
- Goal progress
- Visual analytics powered by Recharts

### 🤖 AI Insights
NexusLife uses AI to provide personalized insights based on user activity.

AI-powered features can help with:
- Productivity analysis
- Goal roadmaps
- Motivational content
- Personal insights
- Progress analysis

AI requests are handled through a secure server-side API rather than exposing the Gemini API key in the frontend.

### ☁️ Cloud Data
NexusLife uses Supabase for:
- User authentication
- Cloud database
- User-specific data
- Secure data isolation

Each user's data is protected using Supabase Row Level Security (RLS).

### 🔐 Authentication
- Email/password registration
- Secure login
- Password recovery
- Password reset
- Session management
- Individual user accounts

### 🔔 Reminders
- Telegram reminder integration
- Personal productivity reminders

### 💾 Data Export
- Export personal NexusLife data as JSON
- Backup and portability support

### 🌓 Theme
- Dark mode
- Light mode
- Neon-green cyberpunk/terminal-inspired interface

---

## 🛠️ Tech Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- Zustand
- Recharts

### Backend & Services

- Supabase Authentication
- Supabase PostgreSQL
- Supabase Row Level Security
- Vercel Serverless Functions
- Google Gemini API

### Deployment

- GitHub
- Vercel

---

## 🏗️ Architecture

```text
                    NexusLife
                        │
                        ▼
                React + Vite
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
   Supabase Auth                NexusLife API
          │                           │
          ▼                           ▼
   Supabase Database             Vercel Function
          │                           │
          ▼                           ▼
     RLS Security                 Gemini API
          │
          ▼
    User-specific data
```

---

## 🔐 Security

NexusLife is designed as a multi-user application where each user's data is isolated.

Supabase Row Level Security ensures that users can only access their own:

- Habits
- Expenses
- Goals
- Journal entries
- Learning records
- Mood data
- Personal settings

Sensitive API keys are kept server-side.

For example:

```text
Frontend
   ↓
/api/gemini
   ↓
Secure server-side environment variable
   ↓
Gemini API
```

The Gemini API key is never exposed through the frontend.

---

## 📁 Project Structure

```text
Nexus_Life/
│
├── api/
│   └── gemini.js
│
├── src/
│   ├── ai/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── stores/
│   ├── utils/
│   └── ...
│
├── public/
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── vercel.json
```

---

## ⚙️ Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd Nexus_Life
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

GEMINI_API_KEY=your_gemini_api_key
```

Never commit `.env.local` or real API keys to GitHub.

### 4. Start the development server

For the Vite frontend:

```bash
npm run dev
```

For testing the Vercel serverless API locally:

```bash
npx vercel dev
```

---

## 🌐 Live Application

The latest deployed version of NexusLife is available here:

**https://nexus-life-ten.vercel.app/**

---

## 🎯 Project Vision

NexusLife was created around a simple idea:

> **Improving your life starts with understanding your daily actions.**

By bringing habits, finances, goals, learning, productivity, and reflection into one platform, NexusLife aims to make personal improvement more measurable, organized, and sustainable.

---

## 🔮 Future Improvements

Potential future improvements include:

- Progressive Web App (PWA) support
- Mobile application
- Advanced AI coaching
- More detailed financial analytics
- Automated habit recommendations
- Calendar integration
- More notification channels
- Improved data visualization
- Offline-first support
- Advanced personalization

---

## 👨‍💻 Author

Developed as a personal productivity and life-management project.

**NexusLife — Build a better tomorrow, one day at a time.**

---

## 📄 License

This project is currently intended for educational and personal use.
