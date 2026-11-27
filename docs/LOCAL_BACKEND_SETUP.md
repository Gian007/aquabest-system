# Local Backend Setup (Temporary SQLite + Express)

## Requirements
- **Node.js:** v22.13+ or v24+ (uses built-in `node:sqlite`)
- **Database path:** `server/data/aquabest-dev.sqlite` (gitignored)

## Commands
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```
3. **Seed illustrative demo records (idempotent):**
   ```bash
   npm run db:seed
   ```
4. **Start temporary backend (`127.0.0.1:8787`):**
   ```bash
   npm run dev:backend
   ```
5. **Start frontend (`http://localhost:5173/aquabest-system/?view=business`):**
   ```bash
   npm run dev
   ```
6. **Run backend & frontend tests:**
   ```bash
   npm run test:backend
   npm run test:frontend
   ```

## Resetting Demo Database Safely
Stop `npm run dev:backend`, delete `server/data/aquabest-dev.sqlite*`, then run `npm run db:migrate && npm run db:seed`.
