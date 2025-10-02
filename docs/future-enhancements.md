# SSC Toolset – Future Enhancements

## Dataset Management
- Population upload: allow selection of associated ADM level, aggregate upwards automatically.
- Completeness flag for datasets (all units covered vs partial).
- GIS upload: support flexible formats (CSV → shapefile → GeoJSON).
- Dataset joins management card on country landing page:
  - Show integration health (joins between admin, population, GIS).
  - Fuzzy matching for place names and manual overrides.

## Metadata & Projections
- Extend `countries` with:
  - growth_rate_urban, growth_rate_rural, growth_rate_periurban
  - avg_household_size_urban, avg_household_size_rural, avg_household_size_periurban
- Use metadata to project current-year population when census data is outdated.
- Join population with GIS polygons to calculate population density.
- Auto-classify settlements as urban/peri-urban/rural based on density thresholds.

## Versioning
- Implement `*_versions` tables for admin_units, population_data, gis_layers.
- Allow SSC instances to lock to specific dataset versions.
- Provide comparison tools to show differences between versions (e.g. place names, population changes).

## UI/UX
- Add cards to landing page:
  - Dataset joins
  - Population projections & density
  - Version history
- Health badges (complete / incomplete dataset coverage).
- Improved error handling in upload modals (skip bad rows, report counts).

## Workflow & Tooling
- Improve parser resilience (trim headers, ignore blank rows, normalize level casing).
- Provide downloadable templates based on selected ADM levels and dataset type.
- Archive outdated files in `/archive/` for traceability.
- Add a simple CI smoke test using sample datasets.
