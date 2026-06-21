# GameLog v1.5

A Letterboxd-style social game diary with fast mobile discovery, Supabase accounts, game logging, reviews, lists, library shelves, quests, imports, and a new Wrapped hub.

## New in v1.5

- New **Wrapped** tab
- Shareable yearly taste summary
- Copy Wrapped text button
- Top genre, top vibe, backlog pressure cards
- Genre breakdown bars
- Rating curve bars
- Platform footprint
- Most-loved game card
- Mood map
- Next best moves panel
- Package version bumped to `1.5.0`

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Windows scripts

- `setup-gamelog.bat` — first-time setup
- `start-gamelog.bat` — start the local dev server
- `update-gamelog.bat` — pull latest GitHub code, install deps, and start

## Environment

Copy `.env.example` to `.env.local` and add your keys. Do not commit `.env.local`.
