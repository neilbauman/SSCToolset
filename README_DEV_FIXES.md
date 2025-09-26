# SSC Toolset – Stability & Architecture Guide

## Supabase Clients
- **Browser:** `@/lib/supabase/supabaseBrowser` (re-exported via `@/lib/supabase`)
- **Server:** `@/lib/supabase/supabaseServer` (re-exported via `@/lib/supabase`)
- **Always import:** `import { supabaseBrowser, supabaseServer } from "@/lib/supabase";`

## API Routes (Next.js 15)
- Use `NextRequest`, `NextResponse` from `"next/server"`.
- Export `GET`, `POST`, etc. as named functions.
- Keep `app/api/**/route.ts` thin; call service functions in `lib/services/**`.

## Framework Editor Data
- Fetch via `/api/framework/versions/[id]/items` which returns a **normalized** tree:
  `Pillar -> Theme -> Subtheme`.
- Normalization logic lives in `lib/services/framework.ts` to prevent UI duplication bugs.

## Types
- Source of truth in `lib/types/framework.ts`.

## Naming & Paths
- Paths use `@/*` (see `tsconfig.json`).
- Services must use **named exports** (no default).

## UI & Branding
- Tailwind + shadcn/ui + Lucide.
- Keep GSC color palette in Tailwind config and reuse utility classes.

## Migrations / RPC
- If present, RPC `duplicate_from_catalogue(name_in)` is used to duplicate a catalogue into a new draft.
- Otherwise, we insert a blank draft and let the UI guide next steps.
