ta
# 4Eunoia – Your Life, In Harmony

4Eunoia is a comprehensive Next.js application that serves as your personal operating system for productivity, self-reflection, and well-being. It brings together multiple life domains—from tasks and expenses to mood tracking and journaling—augmented with AI-powered insights to help you better understand your habits, optimize your routines, and live more intentionally.

---

## ✨ Key Features

This app offers a holistic view of your life and helps you stay balanced through data and insight.

### **Core Tracking & Management:**

- **Daily Log:** Capture activities, moods (with emojis 😊), detailed notes, and free-form diary entries.
- **Task Management:** Manage tasks with statuses (Pending, In Progress, Completed), due dates, and notes.
- **Calendar:** Visual monthly calendar to manage and create events.
- **Reminders:** Schedule and manage upcoming reminders.
- **Expense Tracking:** Log and categorize expenses; visualize trends and totals.
- **Notes:** Create and organize notes for thoughts, meetings, and more.
- **Goals & Habits:** Track long-term goals and daily/weekly/monthly habits, including streak views.
- **Wellness Center:**
  - **Mood Tracking:** Track emotional state throughout the day.
  - **Journaling:** Reflect with prompts and free writing.
  - **Focus Rituals:** Basic calming soundscapes for concentration.
  - **Micro-Exercises:** Short CBT-based mental health exercises (basic).

### **🧠 AI-Powered Insights (via Genkit + Google Gemini):**

- **Productivity Pattern Recognition:** Identify peak hours, distractions, and performance patterns.
- **Expense Analysis:** See spending summaries, averages, and trends.
- **Task Analytics:** Completion rates, overdue counts, and consistency analysis.
- **Sentiment Analysis:** Detect emotional tone and themes in your diary or notes.
- **Diary Summarization:** Weekly/monthly summary with emotional and event highlights.
- **Life Balance Assessment:** Evaluate how balanced your time is across life domains.
- **Burnout Risk Estimator:** Estimate burnout risk using recent log data.
- **Planned:**
  - **Daily Assistant Feed:** Mood forecast, day planning suggestions, reminders, and more.
  - **AI Reflection Coach:** Guided weekly review sessions powered by prompts.

### **🔁 Advanced / Experimental Features:**

- **Adaptive Goal Suggestions:** (Planned) Personalized habit/goal tweaks based on progress.
- **Context-Aware Suggestions:** (Planned) Suggestions based on emotion, weather, time, etc.
- **Neurodivergent Mode:** Task chunking tips, low-stimulation UI settings (in progress).
- **Visual Dashboards:** Charts for task stats, habit consistency, and spending insights.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **AI:** Google Gemini via Genkit SDK
- **Forms:** React Hook Form + Zod
- **Dates:** date-fns
- **Charts:** Recharts
- **Storage:** `localStorage` (demo use only — Firestore recommended)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone <repo-url>
cd 4eunoia
npm install
# or
yarn install
```

### Environment Variables

Create a `.env.local` file:

```env
GOOGLE_GENAI_API_KEY=your_api_key
```

### Start App

```bash
npm run dev
# or
yarn dev
```

App runs at `http://localhost:9002`.

To launch the Genkit dev UI:

```bash
npm run genkit:dev
# or
npm run genkit:watch
```

Usually available at `http://localhost:4000`.

---

## 📂 Project Structure

```
.
├── public/               # Static files
├── src/
│   ├── app/              # Next.js routes and layouts
│   ├── ai/               # Genkit AI flows and setup
│   ├── components/       # UI and reusable components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utility and config files
│   └── services/         # Data logic (stub/localStorage for now)
├── .env                  # Sample environment config
├── tailwind.config.ts    # Tailwind setup
├── tsconfig.json         # TypeScript settings
└── README.md             # This file
```

---

## 💡 Usage

- Use the sidebar to switch between features (Tasks, Logs, Calendar, etc.).
- Input data using each section’s forms.
- Visit **Insights** for AI-powered summaries and analytics.
- View **Visualizations** for charts and trends.
- **Data Warning:** All data is local to your browser. It will not sync across devices and may be lost on cache clear.

---

## 🧠 AI Details

- Uses Genkit + Gemini for intelligent flows (in `src/ai/flows/`).
- Flows include Zod validation for structure.
- Data currently fetched from `localStorage` for demo purposes.
- For full production AI use, integrate a real database like Firestore.

---

## 🗺️ Roadmap

- [ ] Firebase/Firestore backend
- [ ] Mobile app (React Native or Expo)
- [ ] AI Reflection Coach
- [ ] Offline/PWA support
- [ ] User accounts & login
- [ ] Plugin support (Google Calendar, Notion, etc.)
- [ ] Advanced AI assistants (burnout detection, productivity coaching)

---

## ⚠️ Known Limitations

- No account system or data sync
- Data lost on browser cache clear
- AI can't access real user data server-side yet
- Focus and wellness tools are basic/minimal

---

## ✨ Feature Summary

- ✅ Logs
- 📆 Calendar
- 📋 Tasks
- 🔔 Reminders
- 💸 Expenses
- 📝 Notes
- 🎯 Goals & Habits
- 🧘 Wellness
- 🤖 AI Insights
- 📊 Charts
- 🧑‍🔬 Neurodivergent Support
- ⚙️ Custom Settings

---

## 🤝 Contributing

Open to pull requests! Please fork, branch, commit clearly, and update documentation.

---

## 📜 License

Licensed under the [MIT License](LICENSE).
