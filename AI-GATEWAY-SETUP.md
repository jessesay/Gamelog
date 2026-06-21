# GameLog AI Gateway Setup

GameLog v1.8 uses Vercel AI Gateway through the Vercel AI SDK.

## Local setup

```cmd
pnpm add ai
vercel link
vercel env pull .env.local
node --env-file=.env.local index.mjs
```

Or double-click:

```text
setup-ai-gateway.bat
```

After setup, rerun the smoke test with:

```text
run-ai-gateway-test.bat
```

## In-app feature

Open GameLog and use **AI Coach** from Home or Library. It calls:

```text
/api/ai/backlog-coach
```

That endpoint streams an AI Backlog Coach response using your GameLog data.

## Notes

- Do not commit `.env.local`.
- `VERCEL_OIDC_TOKEN` is temporary, so rerun `vercel env pull .env.local` when local AI Gateway auth expires.
- For production, add the required Vercel/Supabase env vars in the Vercel project settings.
