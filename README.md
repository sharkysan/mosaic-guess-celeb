# Mosaic Guess: Celeb Edition

A real-time, multiplayer image-reveal quiz game built with React and Firebase.

## Features

- **Real-time Multiplayer**: Compete with friends in live game rooms.
- **Mosaic Reveal**: Images are hidden behind a grid and revealed piece by piece.
- **Celebrity Quiz**: Guess the famous person before the image is fully revealed.
- **Fuzzy Name Matching**: Intelligent guess validation that allows for small typos.
- **Live Leaderboard**: Track scores and see who's winning in real-time.
- **Modern UI**: Polished, dark-themed interface with smooth animations.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Backend**: Firebase Firestore, Firebase Authentication
- **Utilities**: Fuse.js (fuzzy matching), Canvas Confetti

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
