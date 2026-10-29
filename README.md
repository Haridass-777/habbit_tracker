# My Habits

Multi-user habit tracker with a glacier-style glowing theme. React (JSX) front end + Express API in one Node server, data in Supabase (free Postgres), sign-in with Google.

- **Signed in with Google:** your habits, logs, journal and settings are saved to your own private account. Other users never see them.
- **Not signed in (guest):** you can try the app, but a banner warns that **nothing is saved** and everything is lost on refresh.

```
server/   Express API (verifies the user's token, filters every query by user)
src/      React app
server/schema.sql              database tables (run once)
server/reset-to-multiuser.sql  only for upgrading the old single-user database
```

## 1. Database (once)

1. Create a free project at https://supabase.com
2. **SQL Editor -> New query**, paste `server/schema.sql`, **Run**.
   - Upgrading from the old single-user version? First export a JSON backup in the old app, run `server/reset-to-multiuser.sql`, then `server/schema.sql`. After signing in, use Settings -> Import JSON backup.
3. **Project Settings -> API**: copy the **Project URL**, the **anon public** key and the **service_role** key.

## 2. Turn on Google sign-in (once)

1. Google Cloud Console -> **APIs & Services -> Credentials -> Create credentials -> OAuth client ID** (type: *Web application*). If asked, set up the consent screen first (External, add your email).
2. Under **Authorized redirect URIs** add: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret**.
4. Supabase -> **Authentication -> Providers -> Google** -> enable, paste both, save.
5. Supabase -> **Authentication -> URL Configuration**:
   - **Site URL**: your deployed site (e.g. `https://my-habits.onrender.com`)
   - **Redirect URLs**: add `http://localhost:5173`, `http://localhost:4000` and your deployed site URL.

## 3. Run on your computer

Needs Node.js 18+.

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# fill in all four values in .env

npm run dev               # website on http://localhost:5173 (API on :4000)
```

Production mode on one port: `npm run build` then `npm start` (http://localhost:4000).

## 4. Deploy (Render example)

1. Push to GitHub, then Render -> New -> **Web Service** -> pick the repo.
2. Build: `npm install && npm run build` - Start: `npm start`
3. Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, **`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`** (the `VITE_` ones are needed at build time).
4. Put the Render URL in Supabase **Site URL / Redirect URLs** (step 2.5).

## Notes

- The **service_role** key stays on the server only. The browser only gets the URL and the public *anon* key.
- The server checks the signed-in user's token on every request and filters all data by that user id.
- If the `VITE_` keys are missing, the app still runs in guest mode and the banner says sign-in is not configured.
- Tests: `npm test`
