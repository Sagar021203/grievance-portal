# The Department of Us — Grievance Portal

A private, two-person relationship grievance portal built with React, TypeScript, Vite, Supabase Auth, PostgreSQL, and Supabase Realtime. It keeps the original correspondence-office design: warm stationery, oxblood ink, case references, and custom watercolor artwork.

## What changed

- Removed the app's `localStorage` complaint store. Complaints and replies are stored in Supabase PostgreSQL.
- Added email/password sign-in and account creation. Profiles are created automatically when someone registers, including the selected **Department** or **User** designation.
- The recipient picker is populated from the authenticated profile directory (display names and usernames only).
- Every complaint stores its sender and recipient, then appears in both people's registers.
- The named recipient can submit one official reply. The database advances the case to `awaiting_acknowledgement`.
- The original sender sees the reply and can **Finish the drama** (close the case) or **Take this over WhatsApp**.
- WhatsApp shares a deep link containing the case ID. If someone is not one of the two participants, Row Level Security returns no case data and the app displays: **“This rant is not meant for you, fortunately.”**
- Supabase Realtime refreshes the register and open case when a new complaint, reply, or status update arrives.
- A new animated login/sign-up screen uses a custom watercolor correspondence-desk illustration and the existing design system.

## 1. Create a Supabase project

Create a free project at <https://supabase.com/dashboard>. In Project Settings → API, copy:

- Project URL
- Publishable key (the browser-safe `sb_publishable_...` key)

Do not use a `service_role` or secret key in this frontend project. Never commit database passwords or private keys.

## 2. Create the database tables and security policies

In your Supabase project, open **SQL Editor → New query**. Open `supabase/migrations/202611080001_initial_schema.sql` from this project, copy the complete file into the SQL editor, and run it once.

The migration creates:

- `profiles` — display name, unique username and `department`/`user` designation, linked to `auth.users`.
- `complaints` — sender, recipient, case reference, title, category, description, severity and status.
- `complaint_replies` — the recipient's official response (one per case).
- Signup and reply triggers, the `finish_the_drama` function, indexes, grants, RLS policies, and Realtime publication entries.

Every exposed table has Row Level Security enabled. Only the named sender and recipient can read a case or its reply. Only the sender can close a case after a reply; only the recipient can submit the one official reply. The profile directory exposes names/usernames to authenticated users, not email addresses.

## 3. Add local credentials

At the project root, copy `.env.example` to `.env.local` and fill in your values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

The placeholders are intentionally not usable. The app shows a setup page until both values are configured. Restart Vite after editing `.env.local`.

## 4. Configure Supabase Auth

In Supabase Dashboard → Authentication:

1. Enable the **Email** provider.
2. Keep email confirmation enabled if you want each person to verify their own email. After signing up, check the inbox and confirm before signing in.
3. Under URL Configuration, set your local Site URL to `http://localhost:5173` and add `http://localhost:5173/**` to the redirect URLs.
4. After deploying, add your Vercel URL (for example `https://your-project.vercel.app`) as a Site URL/redirect URL too.

Create an account for each of the two people from the sign-up screen. The person who is you should select **The Department**; the other person should select **The User (Supreme Leader)**. Choose distinct usernames (3–24 characters: letters, numbers, `.`, `-`, `_`). Once both accounts are created, you can disable public sign-ups in Auth settings; existing accounts can still sign in. The dropdown will then show the two registered people.

## 5. Run the project

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Use `npm install` on first setup; it resolves the dependencies and writes a local `package-lock.json`.

Vite prints a local URL, normally `http://localhost:5173`.

Build and preview:

```bash
npm run build
npm run preview
```

## 6. Deploy to Vercel

1. Push this project to your Git repository and import it into Vercel.
2. Keep the default Vite build command (`npm run build`) and output directory (`dist`).
3. In Vercel → Project → Settings → Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production (and Preview if needed).
4. Deploy, then add the deployed URL to Supabase Auth's redirect URL allow-list.

The same Supabase database is used locally and in production. You do not need a separate production database for this app.

## Case lifecycle

| Action | Who can do it | Resulting status |
|---|---|---|
| File a complaint to another person | Any signed-in person | `awaiting_response` |
| Send the official reply | The named recipient only | `awaiting_acknowledgement` |
| Finish the drama | The original sender only, after a reply | `closed` |
| Take it over WhatsApp | The original sender, after a reply | Shares the case URL; it does not change status |

## Private links and access checks

The shared URL looks like `https://your-site.vercel.app/?complaint=<case-id>`. The app waits for authentication, loads only cases permitted by the database policies, and opens the case only if the signed-in account is the sender or recipient. For all other signed-in accounts, no case fields are returned to the browser and the not-for-you screen is shown. A case ID is a locator, not an access token.

## Data and security notes

- There is no app-level `localStorage` cache for complaints or replies. The source of truth is Supabase.
- Supabase Auth persists its own login session in the browser so a member can remain signed in; that is separate from complaint data.
- Use only the publishable key in `VITE_*` variables. A publishable key is not a substitute for RLS; the SQL migration is part of the required setup.
- The database schema does not store the user's email in `profiles` and the frontend directory query does not request email addresses.
- Back up/export important records periodically. Free Supabase projects have different backup and inactivity limits from paid plans.

## Project structure

```text
src/
  assets/                 # Mailbox and sign-in watercolor artwork
  components/             # Auth, setup, complaint form/detail, confirmation
  lib/                    # Supabase client and generated-style DB types
  App.tsx                 # Authenticated register, deep links and realtime
  types.ts                # Shared complaint types/categories
  styles.css              # Existing visual system + auth/workflow styles
supabase/
  migrations/             # SQL schema, triggers, grants, policies, realtime
.env.example              # Placeholder Supabase configuration
```

## Design notes

The visual system is recorded in `DESIGN.md`. The sign-in view is an extension of the existing world: a private correspondence room with warm paper, an editorial serif, quiet file labels, an authored watercolor desk illustration, and a small number of deliberate entrance animations. Reduced-motion preferences are respected.

## Quick acceptance test

1. Sign up once as **The Department** and once as **The User**. Confirm both emails if confirmation is enabled.
2. Sign in as the Department, file a case to the User, and confirm it appears in the Department's register.
3. Sign in as the User in another browser profile/device. Confirm the case appears there and the reply form is available.
4. Send the reply. The Department's register/detail should update in real time to `awaiting_acknowledgement` and show the two resolution actions.
5. As the Department (the original sender), choose **Finish the drama** and confirm the status changes to `closed` for both people.
6. Before closing a separate replied case, share it through WhatsApp. Sign in as the named participant and confirm it opens. Then try the same URL with a third test account: it should show the not-for-you message and the database should return no case/reply data to that account.

The `department` / `user` designation is descriptive. Actual case permissions are based on the sender and recipient IDs enforced by RLS, so neither label alone grants access to another person's cases.
