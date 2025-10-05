# SSC Toolset – Future Enhancements

This document tracks ideas and deferred improvements.  
Do not implement these until explicitly prioritized.

---

## Dataset Management

- **Population Upload Enhancements**
  - Add ADM level selection and automatic upward aggregation.
  - Add completeness and coverage scoring.

- **GIS Upload Enhancements**
  - Accept multiple formats (CSV, Shapefile, GeoJSON).
  - Validate CRS and feature counts.
  - Support linking GIS layers directly to admin boundaries.

- **Join Management**
  - Extend Manage Joins card to visualize dataset relationships.
  - Highlight missing joins or incomplete linkages.
  - Add “join integrity” badge.

---

## Metadata & Projections

- Extend `countries` with metadata:
  - `growth_rate_urban`, `growth_rate_rural`, `growth_rate_periurban`
  - `avg_household_size_urban`, etc.
- Project population data using growth metadata when census year is old.
- Compute population density by joining Population + GIS.
- Auto-classify settlements as urban/peri-urban/rural using thresholds.

---

## Versioning & Comparison

- Add diffing between dataset versions (place names, pop. change, new ADM units).
- Allow SSC Instances to lock to specific dataset versions.
- Version badges: Active / Linked / Archived.

---

## UI/UX Roadmap

- Landing Page cards for:
  - Dataset Joins
  - Population Projections
  - Version History
- Upload modals:
  - Show progress and validation counts.
  - Skip bad rows gracefully.
- Pagination and filtering for large tables.
- Visual indicators:
  - Completeness %.
  - Lowest ADM level.

---

## Tooling & Maintenance

- Add command-line tools for bulk imports.
- Improve parser resilience (case-insensitive headers, blank-row skips).
- Provide standardized templates:
  - Admin (Adm1–Adm5)
  - Population
  - GIS
- Archive older data and schema changes.
- Basic CI check: can upload, view, and join sample data across all types.
