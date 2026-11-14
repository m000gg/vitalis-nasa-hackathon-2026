# Install this delivery into `feat/01-space-radiation`

This archive is a **delta** for the full-stack baseline at commit `a4fc5c0`. It contains only radiation-owned files plus one `.env.example` update, so it will not replace other teammates’ work.

```bash
git switch feat/01-space-radiation
unzip -o /path/to/VITALIS_RADIATION_FULL_IMPLEMENTATION.zip -d .
npm install
cp .env.example .env.local # only if .env.local does not exist yet
```

Fill the existing Supabase variables in `.env.local`. Add `NASA_API_KEY` for a reliable NASA DONKI demo; do not commit `.env.local`.

Then verify and publish the first version:

```bash
node --experimental-strip-types --test tests/radiation.test.mjs
npm run lint
npm run build
git add .env.example docs src tests
git commit -m "feat(radiation): add telemetry dashboard and emergency workflow"
git push -u origin feat/01-space-radiation
```

For a live demo, run `npm run dev`, sign in as the lead, open **Hazards → Radiation**, and launch one of the A–D simulation cards. This writes clear `simulated` records to the existing Supabase tables. It does not need a database migration.
