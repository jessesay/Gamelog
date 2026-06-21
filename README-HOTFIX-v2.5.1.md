# GameLog v2.5.1 Hotfix

Fixes the runtime error:

`matchmakerGames is not defined`

The Deal Radar "watchlist gaps" section was calling an old variable name. This hotfix uses the current Matchmaker picks list instead.

## Install

1. Copy the `components` folder into your GameLog project root.
2. Replace files when Windows asks.
3. Commit in GitHub Desktop:

`Fix v2.5 Deal Radar matchmaker hotfix`

4. Push origin.
5. Restart dev server:

`taskkill /F /IM node.exe`
`pnpm dev`

6. Redeploy Vercel.
