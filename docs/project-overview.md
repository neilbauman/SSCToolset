# SSC Toolset – Project Overview

---

## Technology Stack

- **Frontend:** Next.js 15 (TypeScript, Tailwind, lucide-react icons)
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Deployment:** Vercel

---

## Purpose

Provide a **Country Configuration Toolset** for managing core datasets used by the Shelter and Settlements Severity Classification (SSC) framework.

Each country workspace allows:
- **Administrative Boundaries**
- **Population Data**
- **GIS Layers**
- **Dataset Joins**
- Version control for all datasets.

---

## Current Functional Modules

### 1. **Admin Units**
- Upload CSV of hierarchical place names (Adm1–Adm5).
- Versioned storage in `admin_dataset_versions`.
- Linked to `admin_units` table via `dataset_version_id`.
- Only one active version per country.
- Downloadable system-wide template: `Adm1 Name, Adm1 PCode, … Adm5 PCode`.

### 2. **Population**
- Upload numeric population data linked to PCode.
- Versioned in `population_dataset_versions`.
- Validates required headers (`pcode`, `population`).
- Displays population by admin level.
- Shares UI structure with Admin Units.

### 3. **GIS (in progress)**
- Will accept shapefile/GeoJSON data via upload modal.
- Versioned in `gis_dataset_versions`.
- Will support layer preview and linking via PCode or geometry join.

### 4. **Dataset Joins**
- `dataset_joins` table links Admin, Population, GIS datasets.
- Supports flexible joins (`datasets` JSONB).
- Only active datasets may be joined.
- Will display integrity and linkage badges in the UI.

---

## Core Database Schema

### countries
| column | type | notes |
|--------|------|-------|
| iso_code | text (PK) | |
| name | text | |
| adm0–adm5_label | text | hierarchical labels |
| dataset_sources | jsonb | metadata |
| extra_metadata | jsonb | extended info |

### admin_units
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| country_iso | text | FK |
| pcode, name, level, parent_pcode | text | |
| dataset_version_id | uuid | FK → admin_dataset_versions |
| metadata, source | jsonb | optional |
| created_at, updated_at | timestamp | |

### population_data
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| country_iso | text | FK |
| pcode, name | text | |
| population | bigint | |
| dataset_version_id | uuid | FK → population_dataset_versions |
| year, dataset_date | int/date | |
| source, metadata | jsonb | |
| created_at, updated_at | timestamp | |

### gis_layers
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| country_iso | text | FK |
| layer_name, format | text | |
| feature_count, crs | int/text | |
| dataset_version_id | uuid | FK → gis_dataset_versions |
| created_at, updated_at | timestamp | |

### dataset_joins
| column | type | notes |
|--------|------|-------|
| id | uuid | PK |
| country_iso | text | |
| datasets | jsonb | array of dataset_version_ids |
| advanced | boolean | |
| is_active | boolean | |
| notes | text | |
| created_at | timestamp | |

---

## Current Focus Areas (October 2025)

- ✅ Admin Units: functional versioning, uploads, selection, hard delete.
- ✅ Population: versioning, upload validation, editable metadata.
- ⚙️ GIS: structure and UI stub ready for implementation.
- ⚙️ Join Management: displays existing joins and flexible mapping options.

---

## Known Fragilities

- DB naming mismatches and caching errors during schema updates.
- Type safety across upload modals.
- Multi-active version bugs (to be hardened).
- Supabase schema cache invalidation.

---

## Next Steps (Active)

1. Refine Population page parity with Admin Units (UI + behavior).
2. Add GIS upload, version table, and dataset linking.
3. Ensure only one active dataset per type.
4. Harden Delete/Deactivate/Linked-state logic.
5. Begin Join visualization (ManageJoinsCard → detail page).
6. Prepare SSC Instance integration layer (future phase).
