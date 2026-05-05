# Security Specification - Mosaic Guess: Celeb Edition

## Data Invariants
1. A player can only belong to a room they have joined.
2. Only the host can start the game or change room settings.
3. Scores can only be incremented by the system or upon a valid guess (though in a client-side Firestore app, we'll try to restrict updates to owner-only where possible).
4. Users cannot modify other users' scores or readiness status.

## The Dirty Dozen (Potential Attacks)
1. **Host Spoofing**: Player B tries to set themselves as host of Room A.
2. **Score Inflation**: Player B tries to set their score to 99999.
3. **Cheat Reveal**: Player B tries to force the room's `revealProgress` to 100% manually.
4. **Name Stealing**: Player B tries to change Player A's display name.
5. **Answer Injection**: Player B tries to set the `currentCelebrity` before the round starts.
6. **Room Deletion**: Non-host tries to delete a room.
7. **Orphaned Player**: Creating a player in a room that doesn't exist.
8. **Spam Guesses**: Flooding the `lastGuess` field with huge strings.
9. **Identity Spoofing**: Creating a player with another user's UID.
10. **State Skipping**: Trying to set room status to 'finished' while it's 'waiting'.
11. **PII Leak**: Reading private data of other users (if we had any, here we mostly have game state).
12. **Reveal Poisoning**: Injecting invalid indices into `hiddenPieces`.

## Rules Logic
I will implement rules that ensure:
- Users can create rooms and become hosts.
- Players can only write to their own player document in a room.
- Users can read all rooms and players (public game listing).
- Only the host can update room-level fields (`status`, `currentCelebrity`, etc.).
