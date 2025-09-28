
# Task Manager App (React)

A modern **Task Manager** built with **React** and **TailwindCSS**, featuring task creation, checklists, uploads, task status tracking, and persistent storage in the browser. Designed to help you organize your day and keep track of pending, completed, and upcoming tasks.

## Features

**Task Management**

* Add, edit, and delete tasks.
* Tasks are categorized by status: **Today**, **Pending**, **Upcoming**, **Finished**, and **Incomplete**.
* Drag-and-drop tasks between statuses for quick updates.
* Task details include: Title, Category, Date, Priority (Low / Medium / High), Notes / subtasks, Reason for pending or incomplete tasks.

**Pending & Incomplete Tracking**

* Mark tasks as **Completed**, **Not Completed**, or **Pending**.
* For incomplete or pending tasks, input a reason directly in the task card.
* Reasons are displayed in the task for future reference, helping track why tasks weren’t completed.

**Completed Tasks**

* Completed tasks automatically turn **green gradient**.
* Incomplete tasks have a subtle gradient to differentiate from other tasks.

**Upload Schedule**

* Upload a `.txt` or pasted schedule to create multiple tasks at once.
* Supports `Day 1 - Task` format.
* Choose start date: **today** or a custom date.
* Automatically creates tasks for the correct dates.
* Includes a **loading animation** during file processing.
* Uploaded tasks appear in **Today** or the chosen date onwards.

**Checklist Tasks**

* Create multiple checklist tasks in one go.
* Mark each checklist item as done.
* Each checklist item behaves like a normal task.
* Each item can be individually deleted from the dashboard.

**Banner Carousel**

* Displays a featured task or uploaded schedule.
* Automatically rotates every 20 seconds.
* Includes subtle gradient background animations.

**Search**

* Filter tasks by title, category, or notes.
* Instant search updates.

**Persistent Storage**

* Tasks are stored in **localStorage**.
* Refreshing the page retains all tasks and statuses.

## Getting Started

**Prerequisites**

* Node.js (v16+ recommended)
* npm or yarn

**Installation**

1. Create a new React project (Vite recommended):

```
npm create vite@latest task-manager-app
cd task-manager-app
```

2. Install dependencies:

```
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. Configure Tailwind:

* Update `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}
```

* Add Tailwind directives to `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. Replace `src/App.jsx` with:

```jsx
import React from "react";
import TaskManagerApp from "./TaskManagerApp";

export default function App() {
  return <TaskManagerApp />;
}
```

5. Create `TaskManagerApp.jsx` and paste the **full React code** of the Task Manager app.

## Running the App

```
npm run dev
```

* Open your browser at the URL shown (e.g., `http://localhost:5173`).

## Building for Production

```
npm run build
npm run preview
```

* The production-ready build will be in the `dist` folder.

## Usage

1. **Add Task**

   * Click `+ Add Task` and select:

     * **Manual**: Fill task details manually.
     * **Upload file**: Upload a schedule `.txt`.
     * **Checklist**: Create multiple tasks as a checklist.

2. **Manage Task**

   * Drag-and-drop tasks to move between tabs.
   * Edit task by clicking ✎.
   * Delete task by clicking 🗑 (available on Today, Pending, Upcoming tabs).

3. **Mark Status**

   * 👍 Completed
   * 👎 Not completed → prompts for reason
   * ➖ Pending → prompts for reason

4. **View Reasons**

   * Click on incomplete or pending tasks to view reasons why a task is blocked or unfinished.

5. **Upload Schedule**

   * Follow the steps in the upload modal:

     * Step 1: Preview format.
     * Step 2: Map data to days (optional).
     * Step 3: Paste schedule or upload `.txt`.
   * Choose start date and confirm upload.
   * Tasks are automatically added to the task list.

## Tech Stack

* React
* TailwindCSS
* LocalStorage (for persistence)
