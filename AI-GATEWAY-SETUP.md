# GameLog AI Gateway Setup

This patch adds:

- `index.mjs` — a simple AI Gateway smoke test using the Vercel AI SDK.
- `setup-ai-gateway.bat` — installs `ai`, links the folder to Vercel, pulls env vars, and runs the test.
- `run-ai-gateway-test.bat` — refreshes env vars and reruns the test.

## Use

Copy these files into the root of your GameLog repo, next to `package.json`.

Then double-click:

```text
setup-ai-gateway.bat
```

After setup, rerun the smoke test any time with:

```text
run-ai-gateway-test.bat
```

## Manual commands

Since GameLog uses pnpm:

```cmd
pnpm add ai
vercel link
vercel env pull .env.local
node --env-file=.env.local index.mjs
```

If `vercel` is not installed:

```cmd
npm install -g vercel
```

## Notes

- The Vercel OIDC token is temporary, so `vercel env pull .env.local` may need to be rerun during local development.
- Do not commit `.env.local`.
- Commit `index.mjs`, `setup-ai-gateway.bat`, `run-ai-gateway-test.bat`, and this markdown file if you want the setup helper in GitHub.
