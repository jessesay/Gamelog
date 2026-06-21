
## GameLog v2.8 — Launch Website Layer

GameLog now has a real website shell in front of the app. The public home page explains the product, while the full app now lives at `/app`.

New public routes:

- `/` — marketing landing page
- `/app` — full GameLog app
- `/about` — product story
- `/roadmap` — public roadmap
- `/press` — press kit / launch copy
- `/privacy` — beta privacy page
- `/terms` — beta terms page
- `/launch` — beta launch checklist
- `/robots.txt` and `/sitemap.xml` — SEO basics

Also updated PWA shortcuts to open `/app?view=...`, refreshed metadata, and added launch-ready footer links.

# GameLog v2.6 — Release Radar Layer

GameLog is now a gaming command center: Pulse, Matchmaker, Arena, Deal Radar, Price Watch, and Release Radar.

## New in v2.6

Release Radar adds a launch board for games and product families:

- Upcoming / this year / recent / evergreen labels
- Radar score based on taste, backlog, watchlist, sale, release year, and DLC family signals
- DLC and smaller products stay nested under the base game
- Save to backlog from Radar
- Watch price from Radar
- Details from Radar
- PWA shortcut for Release Radar

## Install

Copy the patch files into your repo, replace existing files, commit, push, and redeploy.

Recommended commit message:

`Build GameLog v2.6 Release Radar layer`

## GameLog v2.7 - Collections Layer

GameLog now includes a Collections hub for shareable shelves and playlists. It turns Matchmaker, Deal Radar, Release Radar, DLC families, and the user's backlog into ready-made collections such as Tonight's Shortlist, Hidden Gems Under $10, Backlog Battle Plan, DLC and Add-on Watch, Upcoming Watchlist, Rainy Weekend Games, and Couch Co-op/Social Picks. Collections can be saved locally, copied as share text, or published into normal public GameLog lists.

Test path: Home -> Collections, top nav -> Collections, mobile nav -> Collect.
