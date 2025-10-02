# SSC Toolset – Project Overview

## Stack
- Frontend: Next.js 15 (TypeScript, Tailwind, lucide-react icons)
- Backend: Supabase (DB, Auth, Storage)
- Deployment: Vercel

## App Purpose
Provide a **Country Configuration workspace**:
- Landing page: map + metadata + dataset cards
- Dataset pages:
  - Admin Units
  - Population
  - GIS
- Shared UI: DatasetHealth, Upload Modals, Edit Modals, DeleteConfirm

## DB Schema
### countries
- iso_code, name, adm0–adm5 labels
- dataset_sources (jsonb)
- extra_metadata (jsonb)

### admin_units
- id (uuid PK)
- country_iso (FK)
- pcode, name, level, parent_pcode
- metadata (jsonb)
- source (jsonb)

### population_data
- id (uuid PK)
- country_iso (FK)
- pcode, name
- population, year, dataset_date
- source
- created_at, updated_at

### gis_layers
- id (uuid PK)
- country_iso (FK)
- layer_name, format, feature_count, crs
- source
- created_at, updated_at

## Fragility Flags
- Route typing
- Metadata JSONB parsing
- DB naming mismatches
- Build stability

## Next Steps (active)
- Harden Admin Units upload workflow (replace dataset, handle empty states, health checks)
- Mirror the same pattern for Population & GIS pages
- Add joins management card to landing page
- Enable projections (growth, density) later
