# ⚖️ LegalIntel: AI-Powered Legal Document Analysis

LegalIntel is a powerful web application designed to demystify complex legal documents for everyday users. By leveraging the power of Google's Gemini generative AI, it provides comprehensive analysis, risk assessment, and interactive simulations, making legal information more accessible and understandable.

Whether you're a tenant reviewing a lease, a freelancer checking a contract, or simply someone trying to understand a complex agreement, LegalIntel is your AI-powered legal assistant.

## ✨ Key Features

- **📄 Document Upload & Analysis**: Upload your legal documents (.pdf, .txt) and let the AI perform a deep-dive analysis.
- **📊 Executive Summary**: Get a quick, plain-English overview of the entire document, including the balance of power between parties.
- **🚨 Risk Radar**: Automatically identifies the top red-flag clauses and hidden traps, such as auto-renewals or buried fees.
- **🤖 AI Legal Simulator**: An interactive chat interface to ask specific questions about your document ("What happens if I miss a payment?") and get AI-generated answers based on the document's content.
- **🎭 Role-Play Simulator**: Practice legal scenarios by role-playing with an AI. Choose a role (client, lawyer, judge) and a scenario to prepare for real-life interviews and negotiations.
- **🤝 Lawyer Recommendations**: Based on the document's content, the app suggests a category of lawyer and can recommend affiliated lawyers for consultation.
- **🔐 Secure & Private**: Built on Firebase, ensuring user data is secure. Documents are processed privately and are tied to your account.
- **👨‍⚖️ Admin & Lawyer Dashboards**: Includes dedicated dashboards for admins to manage users and lawyers, and for lawyers to manage their profiles and case logs.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/) components
- **AI**: [Google Gemini](https://deepmind.google/technologies/gemini/) via [Genkit (an open-source GenAI framework)](https://firebase.google.com/docs/genkit)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Cloud Storage)
- **Deployment**: Ready for [Vercel](https://vercel.com/)

## ⚙️ Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- A Firebase project with Authentication, Firestore, and Storage enabled.

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/legalintel.git
    cd legalintel
    ```

2.  **Install NPM packages:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**

    Create a `.env` file in the root of your project. This file will hold all of your secret keys.

    You will need two main credentials:
    - **Firebase Service Account Key (JSON)**: Go to your Firebase project settings -> Service accounts -> Generate new private key.
    - **Firebase Web App Config**: Go to your Firebase project settings -> General -> Your apps -> Web app -> SDK setup and configuration.
    - **Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

    Add the following variables to your `.env` file:

    ```env
    # For Firebase Admin SDK (server-side)
    FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    FIREBASE_CLIENT_EMAIL="YOUR_CLIENT_EMAIL_FROM_SERVICE_ACCOUNT"
    FIREBASE_PRIVATE_KEY="YOUR_PRIVATE_KEY_FROM_SERVICE_ACCOUNT" # Make sure to handle newlines correctly

    # For Firebase Client SDK (browser-side)
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_WEB_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_PROJECT_ID.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_PROJECT_ID.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
    
    # For Genkit/Gemini
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```
    
    **Important**: When pasting the `FIREBASE_PRIVATE_KEY` into the `.env` file, you may need to wrap it in quotes (`"`) and ensure the newline characters (`\n`) are correctly escaped if you copy it directly from the JSON file.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License

This project is licensed under the MIT License - see the LICENSE.md file for details.
