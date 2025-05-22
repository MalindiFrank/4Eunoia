
# -- -- 4Eunoia –- --

4Eunoia is a comprehensive Next.js application designed as your personal operating system for productivity, self-reflection, and well-being. It integrates multiple life domains—from tasks and expenses to mood and attention tracking—augmented with AI-powered insights to help you understand habits, optimize routines, and live more intentionally.

---

## ✨ Key Features

This app offers a holistic view of your life, helping you stay balanced and productive through data-driven insights and personalized assistance.

### **Core Tracking & Management:**

- **Daily Log:** Capture activities, moods (with emojis 😊), **focus levels (1-5)**, detailed notes, and free-form diary entries.
- **Task Management:** Manage tasks with statuses (Pending, In Progress, Completed), due dates, and notes.
- **Calendar:** Visual monthly calendar to manage and create events.
- **Reminders:** Schedule and manage upcoming reminders.
- **Expense Tracking:** Log and categorize expenses; visualize trends and totals.
- **Notes:** Create and organize notes for thoughts, meetings, and more.
- **Goals & Habits:** Define long-term goals and track daily/weekly/monthly habits, including streak views.
- **Wellness Center:**
  - **Mood Tracking:** Log emotional state and contributing factors.
  - **Journaling:** Reflect with AI-generated prompts or free writing.
  - **Focus Rituals:** Basic calming soundscapes for concentration.
  - **Micro-Exercises:** Short CBT-based mental health exercises (e.g., gratitude, reframing).

### **🧠 AI-Powered Insights & Assistance (via Genkit + Google Gemini):**

- **Daily Personal Assistant Feed (Dashboard):**
    - **AI-Generated Daily Plan:** Suggested schedule based on your tasks, events, recent mood, focus levels, and user-set energy patterns/preferences.
    - **Context-Aware Smart Suggestions:** Dynamic recommendations for routines, focus, breaks, or self-care based on time of day, recent logs (mood/focus), schedule, and user preferences.
- **Productivity Pattern Recognition:** Identifies peak performance times, common distractions, and assesses attention quality.
- **Expense Analysis:** Provides spending summaries, average daily spending, top categories, and savings suggestions.
- **Task Completion Analysis:** Calculates completion rates, identifies overdue tasks, and offers a summary of task performance.
- **Sentiment Analysis:** Detects emotional tone, keywords, and themes from diary entries and notes over a period.
- **Diary Summarization:** Generates weekly/monthly summaries of diary entries, highlighting key events, emotions, and reflections.
- **Life Balance Assessment:** Evaluates time and activity distribution across life areas (Work, Personal Growth, Health, etc.) and suggests improvements for neglected areas.
- **Burnout Risk Meter & Focus Shield (Digital Dopamine Manager concept):**
    - Estimates burnout risk based on recent activity, mood, task load, and event density.
    - If high risk is detected and "Focus Shield" (in Neurodivergent Mode settings) is enabled, the dashboard subtly de-emphasizes non-critical cards to promote focus.
- **Attention Patterns Analysis:** Analyzes daily logs (especially focus levels) to identify periods of high/low attention, common activities during these periods, and provides an attention quality score with suggestions.
- **AI Reflection Coach (Weekly):** Guides users through a weekly reflection session with prompts about wins, challenges, and patterns, based on their data from the past week.
- **AI-based Voice Companion (Dashboard):**
    - Transcribes spoken input.
    - Uses AI to classify intent (log activity, create task, create note) and extract details.
    - Provides a text response confirming understanding or asking for clarification.
- **Emotionally-Informed Planning:** The Daily Plan generation AI now more deeply considers recent mood history, focus levels, and user-defined energy patterns to suggest task timing and intensity.
- **Adaptive Goal & Habit Engine (Setting):**
    - Allows users to set a "Growth Pace" (Slow, Moderate, Aggressive) in settings, which can influence AI suggestions for goals/habits (conceptual, currently influences AI tone and suggestion style).

### **📊 Analytics & Visualizations:**

- **Visual Dashboards:** Charts for task status distribution, expenses by category, and weekly activity frequency (logs, events, notes).
- **Life Timeline (Conceptual):** The foundation is laid with data logging; future development could visualize this long-term.
- **Habit Efficacy Score (Conceptual):** Data on habits is tracked; AI could be trained to correlate habits with mood/productivity.
- **Energy vs. Time Heatmaps (Conceptual):** Data on mood/focus is logged; future visualizations could create these heatmaps.

### **🧘 Neurodivergent Mode & Wellness Tools:**

- **Customizable Settings:**
    - Enable/disable Neurodivergent Mode.
    - Task Chunking suggestions (AI can be prompted for this).
    - Low Stimulation UI (applies a grayscale/contrast filter).
    - Focus Mode Timer Style (Pomodoro / Custom - for future Focus Rituals expansion).
    - **Focus Shield:** Integrates with Burnout Risk Meter to de-emphasize UI elements during high-stress periods.
- **Time-Attention Journal:** Integrated into Daily Log via the "Focus Level" (1-5) slider, allowing users to track attention quality per activity. This data feeds into Attention Patterns Analysis and Emotionally-Informed Planning.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **AI:** Google Gemini via Genkit SDK
- **Forms:** React Hook Form + Zod
- **State Management:** React Context (for Data Mode, Sidebar)
- **Dates:** date-fns
- **Charts:** Recharts (via shadcn/ui charts)
- **Storage:**
    - **Mock Data Mode:** Serves static JSON files from `/public/data/`.
    - **User Data Mode:** Uses Browser `localStorage` for all user-generated data. **Data is not synced across devices and will be lost if browser data is cleared.**
- **Testing:** Jest, React Testing Library, Playwright (for E2E tests).

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

Create a `.env.local` file in the root directory:

```env
GOOGLE_GENAI_API_KEY=your_google_gemini_api_key
```
Replace `your_google_gemini_api_key` with your actual API key from Google AI Studio.

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```
The application will usually be available at `http://localhost:9002`.

### Running Genkit Dev UI

To inspect and test AI flows locally:
```bash
npm run genkit:dev
# or for auto-reloading on changes:
npm run genkit:watch
```
The Genkit Developer UI is typically available at `http://localhost:4000`.

### Running Tests

```bash
npm run test # Runs all Jest unit/integration tests
npm run test:watch # Runs Jest tests in watch mode
npm run test:e2e # Runs Playwright end-to-end tests (ensure dev server is running or configure baseURL)
```

---

## 📂 Project Structure

```
.
├── public/
│   ├── data/             # Mock JSON data files (e.g., tasks.json, daily-logs.json)
│   └── ...               # Other static files (e.g., favicon.ico)
├── src/
│   ├── app/              # Next.js App Router: routes, pages, layouts, tests
│   ├── ai/               # Genkit AI flows and setup
│   │   ├── flows/        # Individual AI flow definitions
│   │   └── ai-instance.ts # Genkit AI instance configuration
│   │   └── dev.ts        # Genkit dev server setup
│   ├── components/       # Reusable UI components (app-specific and shadcn/ui)
│   │   ├── ui/           # Shadcn UI components
│   │   └── __tests__/    # Tests for app-specific components
│   ├── context/          # React Context providers (e.g., DataModeContext)
│   ├── hooks/            # Custom React hooks (e.g., useToast, useIsMobile)
│   ├── lib/              # Utility functions, constants, type definitions
│   ├── services/         # Data interaction logic (fetching/saving data)
│   │   └── __tests__/    # Tests for service functions
│   └── tests/            # Playwright E2E tests (if any)
├── .env                  # Environment variables (template, actual in .env.local)
├── components.json       # Shadcn UI configuration
├── jest.config.js        # Jest configuration
├── jest.setup.js         # Jest setup file
├── next.config.ts        # Next.js configuration
├── package.json          # Project dependencies and scripts
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

---

## 💡 Usage

- **Data Modes:**
    - **Mock Data Mode (Default):** On first load, the app uses sample data from JSON files. Changes made in this mode are **not saved**.
    - **User Data Mode:** Click the "**Start My Journey**" button (usually on the Dashboard or a prominent alert). This clears all mock data from view and switches the app to use your browser's `localStorage`. All subsequent data you enter will be saved locally in your browser.
- Use the sidebar to navigate between features (Tasks, Daily Log, Calendar, etc.).
- Input data using each section’s forms.
- Visit the **Insights** page to generate AI-powered analyses and use coaching tools.
- Explore the **Visualizations** page for charts and graphs of your data.
- Customize your experience in the **Settings** page, including theme, AI preferences, and Neurodivergent Mode options.
- **Data Warning:** In "User Data Mode," all data is stored in your browser's `localStorage`. It will not sync across devices and may be lost if you clear your browser's cache or site data. A proper backend (like Firestore) is planned for future versions.

---

## 🧠 AI Details

- Utilizes Google's Gemini models via the Genkit SDK for intelligent features.
- AI flows are defined in `src/ai/flows/` and include:
    - `analyzeAttentionPatterns`: Analyzes focus levels from daily logs.
    - `analyzeExpenseTrends`: Identifies spending patterns and suggests savings.
    - `analyzeProductivityPatterns`: Finds peak times and distractions.
    - `analyzeSentimentTrends`: Detects emotional themes in text.
    - `analyzeTaskCompletion`: Calculates task success rates.
    - `assessLifeBalance`: Evaluates focus across life areas.
    - `estimateBurnoutRisk`: Assesses potential for burnout.
    - `generateDailyPlan`: Creates a personalized daily schedule.
    - `generateDailySuggestions`: Offers contextual tips.
    - `processVoiceInput`: Interprets voice commands.
    - `reflectOnWeek`: Guides weekly reflection.
    - `summarizeDiaryEntries`: Condenses journal entries.
- Each flow uses Zod for input/output schema validation, ensuring structured data interaction with the AI.
- AI models consider user preferences (like AI persona, verbosity, energy patterns) set in the Settings page.
- Data sources for AI analysis depend on the active `dataMode` (mock JSON or user's `localStorage`).

---

## 🗺️ Roadmap

- [ ] **Firebase/Firestore Backend:** Implement a proper database for data persistence and cross-device sync.
- [ ] **User Accounts & Authentication:** Secure user data with Firebase Authentication.
- [ ] **Mobile App:** Develop a companion mobile application (e.g., React Native or Expo).
- [ ] **Advanced Digital Dopamine Manager:** More granular controls for focus and distraction management.
- [ ] **Deeper AI Personalization:** More adaptive AI based on long-term user history and explicit feedback.
- [ ] **Offline/PWA Support:** Enhance offline capabilities for core features.
- [ ] **Plugin Support (External Services):** Integrate with Google Calendar, Notion, etc.

---

## ⚠️ Known Limitations

- **No Cloud Sync (User Data):** User data entered in "User Data Mode" is stored only in the browser's `localStorage` and is not backed up or synced.
- **AI Relies on Client-Side Data:** When in "User Data Mode," AI flows process data fetched from `localStorage` on the client. This is suitable for a personal OS concept but differs from server-side AI processing with a database.
- **Voice Companion is Basic:** Currently classifies intent and suggests actions; full automation of actions (e.g., directly creating a task) is not yet implemented.
- **Digital Dopamine Manager is Conceptual:** Focus Shield is a first step; comprehensive app/website blocking is beyond web app scope.

---

## ✨ Feature Summary (Checklist)

- ✅ Daily Logs (with Mood & Focus Level)
- ✅ Calendar & Event Management
- ✅ Task Management
- ✅ Reminders
- ✅ Expense Tracking & Categorization
- ✅ Notes Creation & Organization
- ✅ Goals & Habits Tracking (with Streaks)
- ✅ Wellness Center (Mood Logging, Journaling, Basic Focus Rituals, Micro-Exercises)
- ✅ AI-Powered Insights (Multiple types as listed above)
- ✅ AI Reflection Coach (Weekly)
- ✅ AI Daily Plan & Suggestions
- ✅ AI Voice Companion (Intent Classification)
- ✅ Visual Dashboards (Task Status, Expense Categories, Activity Frequency)
- ✅ Neurodivergent Mode & Settings (Focus Shield, Low Stimulation UI)
- ✅ Time-Attention Journal (via Daily Log's Focus Level)
- ✅ Customizable Settings (Theme, AI Persona, Growth Pace, Energy Pattern)
- ✅ Mock Data Mode & User Data Mode (localStorage)

---

## 🤝 Contributing

Open to pull requests! Please fork, branch, commit clearly, and update documentation if applicable.

---

## 📜 License

Licensed under the [MIT License](LICENSE) (assuming you'll add one).
