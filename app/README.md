# SIPOC — nieuwe front-end

React + TypeScript + Vite + Tailwind CSS, bovenop dezelfde Supabase-database
als de bestaande `index.html` in de hoofdmap. Deze map bouwt naar een
volwaardige vervanging van dat bestand; tot de overstap gemaakt is blijft
`index.html` het live product (zie de hoofd-[README](../README.md)).

## Starten

```bash
npm install
cp .env.example .env.local   # eventueel eigen Supabase-project invullen
npm run dev
```

## Stack

| Onderdeel        | Keuze                                             |
|-------------------|----------------------------------------------------|
| Build/dev-server  | [Vite](https://vite.dev)                            |
| Taal              | TypeScript                                          |
| UI-library        | React 19                                            |
| Styling           | [Tailwind CSS v4](https://tailwindcss.com) — design tokens in `src/index.css` (`@theme`), overgenomen uit de bestaande `index.html` |
| Routing           | [React Router](https://reactrouter.com)             |
| Server-state      | [TanStack Query](https://tanstack.com/query)        |
| Backend           | Supabase (ongewijzigd — zelfde project/schema als de huidige app) |

## Scripts

- `npm run dev` — lokale ontwikkelserver
- `npm run build` — typecheck (`tsc -b`) + productie-build naar `dist/`
- `npm run lint` — [oxlint](https://oxc.rs/docs/guide/usage/linter.html) (de linter die het Vite-template standaard meegeeft)
- `npm run preview` — de productie-build lokaal bekijken

## Omgevingsvariabelen

`VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY` (zie `.env.example`)
— dit zijn geen geheimen: de `publishable`-sleutel is bedoeld om
client-side zichtbaar te zijn, alle toegang loopt via Supabase Row Level
Security (zie [SPEC.md](../SPEC.md), deel 6).

## Status

Nog in opbouw. Voortgang volgt de fases uit de projectplanning:

1. ✅ Scaffolding — Vite/React/TS/Tailwind, Supabase-verbinding, routing en server-state werkend bevestigd.
2. ✅ Design overzetten — designtokens (`src/index.css`) worden inmiddels ook echt gebruikt door de schermen uit fase 3.
3. ✅ Login + omhulsel — magic-link inlogscherm, zijbalk met zoekbare alfabetische procesboom, routing per proces (`/proces/:id`), account-menu (e-mail + uitloggen), alleen-lezen-badge op basis van eigenaar/bewerker-rechten.
4. ✅ Het SIPOC-bord (kern) — het vijf-kolommen-bord met verbindingslijnen (`src/components/board/`), inline hernoemen (klik) + detailformulieren (dubbelklik): processtap (werkinstructie + functie), herkomst/bestemming (intern/extern), input/output (omschrijving + communicatiesoort) en het procesformulier (omschrijving, versie, doel, proceseigenaar, bewerkers-beheer voor de eigenaar). Board-CSS 1-op-1 overgenomen uit `index.html` (`src/styles/board.css`) voor exact dezelfde layout.
5. ✅ Stamtabellen-beheer — de vier gedeelde lijsten (functies, externe partijen, communicatiesoorten, proceseigenaren) via één herbruikbare `MasterListModal` + `useMasterTable`-hook (TanStack Query), bereikbaar via de "…"-knop naast elk dropdown-veld.
6. ✅ Rechten in de UI — bovenop de alleen-lezen-modus uit fase 3/4 (verborgen bewerkingsknoppen, badge) nu ook een rechtenoverzicht los van het bord (`/toegang`, `src/pages/AccessPage.tsx`): per proces je eigen rol (eigenaar/bewerker/open-legacy/alleen-lezen) met uitleg, en voor elk proces dat je mag beheren de bewerkerslijst direct hier aan te passen zonder het proces te hoeven openen (`ProcessEditorsField`, hergebruikt uit het procesformulier).
7. 🟡 Testen + omschakelen — jij test actief op Vercel; `index.html`/GitHub Pages blijft voorlopig het live product.
8. ✅ (extra, buiten het oorspronkelijke plan) Procesketens — activiteiten kunnen elkaar over proces­grenzen heen aanwijzen (herkomst/bestemming → Intern → Procesactiviteit, met automatische wederzijdse koppeling), en `/procesketens` (toggle naast "SIPOC" linksboven) toont dat als een pan/zoombare graaf (`@xyflow/react`), met een procesfilter voor als het er veel worden. Zie SPEC.md 5b/5e.
