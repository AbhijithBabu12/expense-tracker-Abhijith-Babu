<div align="center">
  <img src="Logo/giphy.gif"" alt="Blissey Logo" width="150" />

   # Meowth Smart Finance

![Live Demo](https://img.shields.io/badge/Live_Demo-Available-success?style=for-the-badge)

**Live Demo:** [meowth-smart.netlify.app](https://meowth-smart.netlify.app/)

Meowth is a fast, responsive, and privacy-focused personal finance and expense tracking application. It allows you to effortlessly manage your income and expenses, view deep analytical insights about your spending habits, and even consult an integrated AI assistant to analyze your financial health—all while keeping your data completely private.

---

## ✨ Features

- **Intuitive Transaction Management:** Easily add income and expenses with automatic date/time tracking, dynamic categories, and custom descriptions.
- **Advanced Analytics:** Visualize your financial data through beautiful, responsive SVG Area Charts, category Donut Charts, and intelligent savings rate calculations.
- **Smart Filtering & History:** Search through your transactions, filter by type or category, and edit or delete past entries seamlessly.
- **AI Financial Assistant (Meowth AI):** Powered by the **Groq API** (running Llama 3), Meowth AI can analyze your spending patterns, highlight trends, and answer questions about your finances directly within the app.
- **100% Private (Local Storage):** Your financial data never leaves your device (except for strictly summarized, anonymized context sent to the AI during a chat). All transactions are saved in your browser's **Local Storage**.
- **Import & Export:** Take your data with you. Export your history to Excel/PDF or import a backup anytime.
- **Responsive Design:** Designed from the ground up to look perfect on both wide desktop screens and mobile devices.

---

## 🛠️ How It Works

### Architecture
This is a Vanilla JavaScript application that relies heavily on modern web standards (ES Modules, CSS Variables, Native DOM APIs) without the overhead of heavy frontend frameworks.
- **Data Layer:** `js/data/transactions.js` and `js/data/storage.js` handle saving and retrieving data to/from the browser's Local Storage.
- **UI Components:** Pages (`home.js`, `history.js`, `analytics.js`, `ai.js`) are modularized and listen for a custom `transactionsChanged` event to automatically re-render when data updates.
- **AI Integration:** The AI feature talks to a **Netlify Serverless Function** (`netlify/functions/ai-chat.mjs`). This securely proxies the request to Groq, ensuring the API key is never exposed to the client-side browser.

---

## 🚀 Running Locally

If you'd like to clone this repository and run it on your own machine, follow these steps:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) installed globally (`npm install netlify-cli -g`). This is required to run the local development server and simulate the serverless functions used for the AI.

### 2. Clone the Repository
```bash
git clone https://github.com/AbhijithBabu12/expense-tracker-Abhijith-Babu.git
cd expense-tracker-Abhijith-Babu
```

### 3. Setup Environment Variables
To use the AI Mode, you will need a Groq API key.
1. Create a file named `.env` in the root folder of the project.
2. Add your Groq API key to it:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Start the Local Server
Run the project using the Netlify CLI to ensure the serverless functions work:
```bash
netlify dev
```
The application will start, and a browser window should automatically open to `http://localhost:8888`.

---

## 🔒 Privacy & Local Storage

Meowth respects your privacy. We intentionally do not use a traditional database. 
Instead, we rely entirely on **HTML5 Local Storage**. 
- **Pros:** Lightning fast, works offline, and ensures nobody else can access your data.
- **Cons:** If you clear your browser data or switch devices, your transactions won't carry over (unless you use the built-in Export/Import feature!).

*Note: When using the AI Assistant, a strictly summarized snapshot of your monthly financial metrics is sent to the server to generate insights. Raw, individual transaction data is never fully exposed.*
