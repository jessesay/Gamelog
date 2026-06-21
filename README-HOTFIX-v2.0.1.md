# GameLog v2.0.1 Hotfix

This fixes the Vercel TypeScript deploy error:

`Block-scoped variable 'reviewedCount' used before its declaration`

The problem came from an old duplicate root-level `GameLogApp.tsx` file being type-checked by Vercel. The real app uses:

`components/GameLogApp.tsx`

This hotfix replaces the old root file with a safe re-export:

`export { default } from "./components/GameLogApp";`

## Install

Copy these files into the root of your GameLog folder and replace existing files.

Then commit:

`Fix v2.0 Vercel build hotfix`

Push origin, then redeploy on Vercel.
