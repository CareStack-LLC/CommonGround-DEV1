# Mini & Mega: Implementation Guide
This document outlines the complete steps and folder structure required to reproduce the "Mini & Mega" Real-Time Multiplayer feature in the CommonGround MVP.
## 1. Folder Structure & Key Files
The following new files and directories were created. Ensure your project matches this structure:
```text
/Users/tj/Desktop/CommonGround-Comms/mvp/
├── .env.local                          # [Existing] Added Supabase keys here
├── package.json                        # [Modified] Added phaser, @supabase/supabase-js
├── public/
│   └── assets/
│       └── minimega/                   # [NEW] Asset Directory
│           ├── bg.jpg                  # Background image
│           ├── mega.png                # Child character sprite
│           └── mini.png                # Parent character sprite
├── src/
│   ├── components/
│   │   ├── Arcade.tsx                  # [Modified] Added MiniMegaGame to library
│   │   └── mini-mega/                  # [NEW] Component Directory
│   │       └── MiniMegaGame.tsx        # [NEW] Core Game & Lobby Logic
│   └── lib/
│       └── supabase.ts                 # [NEW] Supabase Client Singleton
```
## 2. Dependencies
We added two key libraries to `package.json`.
**Command to Install:**
```bash
npm install phaser @supabase/supabase-js
```
**Versions Used:**
- `phaser`: ^3.80.0
- `@supabase/supabase-js`: ^2.39.0
## 3. Configuration (Supabase)
1.  Create a Supabase project at [database.new](https://database.new).
2.  Get your **Project URL** and **anon public key**.
3.  Add them to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_https_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_long_anon_key
```
*Note: No database tables are required for this feature! It relies entirely on Supabase Realtime (Channels/Presence).*
## 4. Implementation Details
### Step A: The Supabase Client (`src/lib/supabase.ts`)
Initializes the connection.
```typescript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);
```
### Step B: The Game Logic (`src/components/mini-mega/MiniMegaGame.tsx`)
This is the heart of the feature. It handles:
1.  **Lobby Presence**: Waits for both a "parent" and "child" user to join the channel.
2.  **Phaser Integration**: Uses a `useEffect` to dynamically load Phaser (Client-Side Only).
3.  **Networking**: Broadcasts player position every few frames and interpolates the partner's position.
### Step C: Asset Setup
We created a specialized directory for the game assets to keep `public/` organized.
- **Source**: Images were processed from your uploads.
- **Destination**: `public/assets/minimega/`
- **Usage**: Referenced in `MiniMegaGame.tsx` as `/assets/minimega/mini.png`, etc.
### Step D: Arcade Integration (`src/components/Arcade.tsx`)
We registered the game in the main arcade menu.
1.  **Import**: `import MiniMegaGame from "./mini-mega/MiniMegaGame";`
2.  **Type Definition**: Added `"minimega"` to the `GameType` union.
3.  **Poster**: Added the `mini.png` as the game card image.
4.  **Render Loop**: Added the conditional render:
    ```tsx
    {activeGame === "minimega" && <MiniMegaGame userRole={userRole} />}
    ```
## 5. Verification
To confirm everything is working:
1.  Run `npm run dev`.
2.  Go to the Video Call page.
3.  Click the **Gamepad** icon.
4.  You should see the "Mini & Mega" card with the purple border.
5.  Clicking it should enter the "Waiting for Player" lobby screen.