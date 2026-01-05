# LingoAI Backend (SQL Server)

This backend scaffold uses Node.js + TypeScript + Express and connects to SQL Server via `mssql`.

Quick start

1. Copy `.env.example` to `.env` and update values (SQL Server credentials, Firebase service account path).
2. Install dependencies:

```bash
cd backend
npm install
```

3. Run in development:

```bash
npm run dev
```

4. To run the Firestore -> SQL migration for users (requires Firebase service account JSON):

```bash
npm run migrate
```

Notes
- The scaffold includes a sample `Users` table, repository, controller, and a migration script for the `users` Firestore collection.
- Extend the `db/schema.sql` and `src/migrate/firestore-to-sql.ts` to cover other collections (lessons, vocabulary, storybooks, etc.).
