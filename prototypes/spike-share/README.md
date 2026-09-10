# aec-spike-share — T4 spike (throwaway)

Renders AEC share cards as PNG (satori 0.32 + resvg-wasm) and share pages with Open Graph tags,
on a Free-plan Worker with Static Assets. Findings and measurements: `docs/discovery/06-partage.md`.

```sh
# from the repository root (Node >= 22 for wrangler; nvm has 24.14)
npx tsx prototypes/spike-share/scripts/build-data.ts   # public/data/*.json + public/fonts/*.ttf (D1.6 measurement)
cd prototypes/spike-share && npm install
npm run types && npm run typecheck                        # worker-configuration.d.ts (Env) is generated, not hand-written
npm run dev                                             # http://localhost:8787
npm run dry-run                                         # bundle to dist/ for size measurement
npm run deploy                                          # https://aec-spike-share.baoleka.workers.dev
```

Generated files (`public/data/*.json`, `public/fonts/*.ttf`, `dist/`, `worker-configuration.d.ts`) are git-ignored.
Text: La France insoumise – L'Avenir en commun, CC BY-NC-SA 4.0 (`data/LICENSE`).
