
# 4Eunoia - Personal Productivity & Wellness OS

4Eunoia is a comprehensive Next.js application designed to be your personal operating system for productivity, self-reflection, and overall well-being. It integrates various tracking tools with AI-powered insights to help you understand your patterns, optimize your routines, and achieve your goals.

![4Eunoia Dashboard (Conceptual)](https://picsum.photos/800/400?random=1&data-ai-hint=dashboard%20productivity)
*(Image is conceptual and may not represent the final UI)*

## ✨ Key Features

This application aims to provide a holistic view of your life and empower you with data-driven insights.

**Core Tracking & Management:**

*   **Daily Log:** Record activities, mood (with emojis 😊), detailed notes, and free-form diary entries.
*   **Task Management:** Create, update, and track tasks with descriptions, due dates, and statuses (Pending, In Progress, Completed).
*   **Calendar:** View and manage events in a monthly calendar interface. Add new events directly.
*   **Reminders:** Set and manage reminders with specific dates and times.
*   **Expense Tracking:** Log expenses with descriptions, amounts, dates, and categories. Visualize spending patterns.
*   **Notes:** A simple yet effective note-taking module for capturing thoughts, meeting minutes, or any other information.
*   **Goals & Habits:** Define long-term goals and track the consistency of daily, weekly, or monthly habits. Includes streak tracking.
*   **Wellness Center:** Tools for well-being, including:
    *   **Mood Tracking:** Log your mood throughout the day.
    *   **Journaling:** Dedicated space for reflection with prompts.
    *   **Focus Rituals:** Select soundscapes to aid concentration (basic implementation).
    *   **Micro-Exercises:** Simple CBT-based exercises like gratitude practice (basic implementation).

**🧠 AI-Powered Insights & Analytics (Powered by Google Gemini via Genkit):**

*   **Productivity Patterns Analysis:** Identifies peak performance times, common distractions, and suggests improvement strategies based on logs, tasks, and calendar data.
*   **Expense Trend Analysis:** Analyzes spending data to provide summaries, totals, averages, and top categories.
*   **Task Completion Analysis:** Calculates completion rates and identifies overdue tasks within a specified period.
*   **Sentiment Analysis:** Analyzes diary entries and notes to determine overall sentiment, score, and key emotional themes.
*   **Diary Summarization:** Provides weekly or monthly summaries highlighting key events, emotions, and reflections.
*   **Life Balance Assessment:** Scores focus across different life areas (Work, Health, Social, etc.) based on logged activities.
*   **Burnout Risk Estimation:** Estimates potential burnout risk based on recent mood, activity, and task load.
*   **Daily Personal Assistant Feed:** Provides a daily summary, mood forecast, suggestions, and motivation on the dashboard.
*   **AI Reflection Coach:** Guided weekly reflections.

**Advanced & State-Aware Features:**

*   **Context-Aware Smart Suggestions:** Recommend routines, focus sessions, breaks, or self-care based on time, past behavior, location, and current mood. Example: If the user logs low mood + unproductive day + rainy weather → suggest a mindfulness audio session or journaling prompt.
*   **Adaptive Goal & Habit Engine:** Use ML to adapt and suggest micro-goals or habit changes based on success/failure patterns. Allow toggling between aggressive, moderate, or slow-paced personal growth modes.
*   **Emotionally-Informed Planning:** Use mood and behavior logs to help plan more realistic days. Example: If Monday mornings are always low energy, start slow and put easy tasks first.
*   **Neurodivergent Mode:** Settings available to enable features like task chunking suggestions and low-stimulation UI.

## 🛠️ Tech Stack

*   **Framework:** Next.js 15 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** shadcn/ui
*   **AI Integration:** Google Gemini via Genkit SDK
*   **State Management:** React Context (implied by `useSidebar`), `useState`, `useEffect`
*   **Forms:** React Hook Form with Zod for validation
*   **Date Management:** date-fns
*   **Charts:** Recharts (via shadcn/ui charts)
*   **Local Data Storage:** Browser `localStorage` (Note: This is used for demonstration and has limitations. A proper backend database like Firebase Firestore is recommended for production).

## 🚀 Getting Started

**Prerequisites:**

*   Node.js (version 18 or later recommended)
*   npm or yarn

**Installation:**

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

**Environment Variables:**

*   This project uses Google Gemini via Genkit. You need to obtain an API key from Google AI Studio.
*   Create a `.env.local` file in the root directory (copy `.env` if it exists).
*   Add your Google Generative AI API key:
    ```env
    GOOGLE_GENAI_API_KEY=YOUR_API_KEY_HERE
    ```
    *   **Important:** Keep your API key secure and do not commit it to version control.

**Running the Development Server:**

1.  **Start the Next.js app:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will typically start the app on `http://localhost:9002`.

2.  **(Optional) Start the Genkit Development UI:**
    If you want to inspect or test the Genkit flows separately:
    ```bash
    npm run genkit:dev
    # or for auto-reloading on changes:
    npm run genkit:watch
    ```
    This will start the Genkit developer UI, usually on `http://localhost:4000`.

## 📂 Project Structure

```
.
├── public/               # Static assets
├── src/
│   ├── app/              # Next.js App Router pages and layouts
│   │   ├── api/          # (Optional) API routes if needed later
│   │   ├── (pages)/      # Route groups for each feature (e.g., tasks, calendar)
│   │   │   ├── page.tsx  # Main component for each page
│   │   ├── globals.css   # Global styles and Tailwind directives
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main dashboard page
│   ├── ai/               # Genkit AI integration
│   │   ├── flows/        # AI flow definitions (e.g., analyze-productivity-patterns.ts)
│   │   ├── ai-instance.ts # Genkit initialization
│   │   └── dev.ts        # Entry point for Genkit dev server
│   ├── components/       # Reusable React components
│   │   ├── ui/           # shadcn/ui components
│   │   └── app-sidebar.tsx # Application sidebar component
│   ├── hooks/            # Custom React hooks (e.g., useToast, useMobile)
│   ├── lib/              # Utility functions and libraries
│   │   ├── utils.ts      # General utility functions (e.g., cn)
│   │   └── firebase.ts   # (If Firebase added) Firebase configuration
│   └── services/         # Data fetching/manipulation logic (currently stubs/localStorage)
│       ├── calendar.ts
│       ├── expense.ts
│       ├── reminder.ts
│       └── task.ts
├── .env                  # Environment variable template
├── .eslintrc.json        # ESLint configuration
├── .gitignore            # Git ignore file
├── components.json       # shadcn/ui configuration
├── next.config.ts        # Next.js configuration
├── package.json          # Project dependencies and scripts
├── postcss.config.js     # PostCSS configuration
├── README.md             # This file
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## 💡 Usage

1.  Navigate through the sidebar to access different modules (Tasks, Calendar, Expenses, etc.).
2.  Add data using the forms provided on each page (e.g., add tasks, log expenses, write notes).
3.  **Data Persistence:** All data is currently stored in your browser's `localStorage`. This means:
    *   Data is specific to the browser you are using.
    *   Clearing browser data will erase all saved information.
    *   Data is not synced across devices.
    *   AI flows running on the server *cannot* directly access `localStorage` reliably and may use mock data or fail if not adapted for server-side data fetching.
4.  Go to the **Insights** page to generate AI analysis based on your logged data. Select the insight type and any required parameters (like date range or frequency).
5.  Go to the **Visualizations** page to see graphical representations of your data (Task Status, Expenses, Weekly Activity).
6.  Explore the **Wellness Center** for mood logging and journaling.
7.  Customize application behavior in the **Settings** page.

## 🤖 AI Integration (Genkit)

*   The application uses the Genkit SDK to interact with Google's Gemini models.
*   AI logic is encapsulated within "flows" located in `src/ai/flows/`.
*   Each flow defines specific input/output schemas (using Zod) and prompts the AI to perform tasks like analysis, summarization, or estimation.
*   Flows are designed to be called from server components or Server Actions (like on the Insights page).
*   **Data Access Limitation:** As mentioned, the AI flows currently attempt to access `localStorage` for data. This is primarily for demonstration purposes during development where Server Actions might have some client-like context. **In a production environment or standard server-side rendering, this will not work.** For AI flows to function correctly with persisted data, integration with a proper database (like Firestore) and server-side data fetching logic is required. Flows accessing localStorage will show warnings in the console and may fall back to using mock data.

## 🤝 Contributing (Optional)

Contributions are welcome! Please follow standard Git workflow (fork, branch, commit, pull request). Ensure code quality, add tests if applicable, and update documentation as needed.

## 📜 License (Optional)

This project is licensed under the [MIT License](LICENSE). (Or specify your chosen license).
