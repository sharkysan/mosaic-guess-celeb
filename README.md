# Mosaic Quiz

A real-time, multiplayer celebrity guessing game featuring a dynamic mosaic reveal system and AI-generated hints.

## Features

- **Real-time Multiplayer**: Compete with friends in live game rooms with synchronized state.
- **Dynamic Mosaic Reveal**: Celebrity images are hidden behind a cryptographic-style grid, revealed randomly tile by tile.
- **AI-Generated Hints**: Integrated **Google Gemini API** provides cryptic, context-aware hints for every celebrity.
- **Fuzzy Guess Management**: Smart validation using Fuse.js allows for slight typos in celebrity names.
- **Live Leaderboard**: Track competitive progress across multiple rounds.
- **Polished Aesthetics**: Dark-themed, glassmorphic UI built with Tailwind CSS and Framer Motion.

## How it Works

1. **Host a Room**: Share your room ID with friends.
2. **The Reveal**: The celebrity portrait begins to reveal randomly.
3. **Get Hints**: If you're stuck, the AI hint system provides a clue.
4. **Guess Fast**: Type your guess in the chat-style input. The first correct guess wins the round!

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Backend**: Firebase Firestore (Real-time DB), Firebase Authentication
- **AI**: Google Gemini API (@google/genai)
- **Utilities**: Fuse.js (Fuzzy search), Canvas Confetti (Celebration)

## Screenshot

![Mosaic Quiz Interface](https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop)
*The app features a sophisticated dark UI with neon accents and real-time multiplayer coordination.*

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Firebase project with Firestore and Google Authentication enabled.

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in a `.env` file (see `.env.example`).
4. Start the development server:
   ```bash
   npm run dev
   ```

## License

This project is licensed under the Apache-2.0 License.
