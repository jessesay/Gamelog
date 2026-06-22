# GameLog Backlog v1

Adds a real backlog page to GameLog.

## What it adds

- `/backlog` page
- `/api/games/backlog` route
- `/api/games/backlog/remove` route
- Updated `GameSwipeDeck` with a `My Backlog` link
- Saved games appear when the user hits `✓` in the discovery feed
- Remove button changes a saved game to `skipped`

## Install

1. Unzip this folder.
2. Open PowerShell in your GameLog project folder.
3. Run this script from wherever you unzipped it, for example:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
C:\path\to\gamelog_backlog_v1\apply-gamelog-backlog.ps1
```

You can also copy `apply-gamelog-backlog.ps1` into your GameLog project folder and run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\apply-gamelog-backlog.ps1
```

## Optional SQL

Run `gamelog_backlog_patch.sql` in Supabase SQL Editor. It only adds an index and reloads the schema cache.

## Test

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Save some games with `✓`, then open:

```txt
http://localhost:3000/backlog
```
