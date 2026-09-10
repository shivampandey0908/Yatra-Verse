# YATRA VERSE

YATRA VERSE is now organised as a simple two-folder JavaScript project:

- `frontend/` — static, vanilla `index.html`, `styles.css`, and `app.js`. There is no React, Next.js, Tailwind, TypeScript, or bundler to learn.
- `backend/` — Express + MongoDB API in one readable `server.js` file. It also serves the frontend in development and production.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`, a long `JWT_SECRET`, and `EMAIL_APP_PASSWORD`.
2. Install backend dependencies: `npm install --prefix backend`.
3. Start the app: `npm run dev`.
4. Open `http://localhost:4000`.

## Gmail verification setup

New traveler and local-guide accounts verify their email before they can sign in. OTP emails are sent from `pandeysp8080@gmail.com` using Gmail SMTP. Enable 2-Step Verification on that Google account, create a Google **App Password** for Mail, then place the 16-character value in `backend/.env` as `EMAIL_APP_PASSWORD`. Keep `EMAIL_USER=pandeysp8080@gmail.com`; never put the normal Gmail password in the file or source code.

## Owner / admin access

Set `ADMIN_EMAIL` in `backend/.env` to the email address you use for your owner account (the example is `pandeysp8080@gmail.com`). Register or sign in with that exact address, then sign out and sign in once if needed. The backend assigns the protected `admin` role during sign-in; no visitor can select it during registration.

From **My account → Open admin portal**, you can:

- approve and publish pending local-guide profiles (so they appear for travelers);
- reject/hide profiles or permanently remove a guide profile and its reviews after moderation;
- mark a genuinely finished booking as completed, which unlocks the traveler’s one-time review form.

## What’s included

- Traveler registration, sign-in, account view, destinations, public verified-guide discovery, and bookings.
- A guide-only portal after guide sign-in. Each guide controls their daily price, availability note, service destinations, experience packages, package inclusions/exclusions, and flexible trip offerings such as airport pickup, meals, permits, or photography.
- A date-based trip planner. It requests a forecast for the exact selected date, displays weather-derived hazards, and shows traffic/diversion status separately.

### About route data

Forecasts use Open-Meteo when available. Traffic and route-diversion status intentionally say **unavailable** until a verified live source is connected. This avoids presenting static or development data as live road information. Connect an appropriate official/state road or mapping provider in the `travel-advisory` endpoint of `backend/server.js` when one is approved for deployment.

The prior `apps/` and `packages/` folders are retained as reference material; the active project and root scripts now use only `frontend/` and `backend/`.

### Live traffic and route incidents

The planner uses TomTom Traffic when `TOMTOM_TRAFFIC_API_KEY` is set in `backend/.env`. Create a Traffic API key in TomTom Developer Portal and add it there; keep it server-side and never add it to frontend files. Traffic flow and nearby active incidents are then returned with each destination check.
