# SSC Toolset – Development Charter

Defines the rules of development for the SSC Toolset project.  
**Goal:** maintain coherence, prevent drift, and ensure sustainable growth through verified green builds.

---

## Core Principles

1. **Green First, Grow Later**
   - Never merge broken code.
   - Vercel build must be green before any new feature is accepted.

2. **No Drift**
   - All changes must align with `project-overview.md`.
   - New ideas go into `future-enhancements.md` — never directly into code.

3. **Incremental Development**
   - Small additive commits > full rewrites.
   - If replacing, move old files to `/archive/` for traceability.

4. **Shared Typed Interfaces**
   - Keep shared types in `/types/`:
     - `Country`, `AdminUnit`, `PopulationRow`, `GISLayer`, `DatasetVersion`, `DatasetJoin`.
   - No ad-hoc type redefinitions in pages.

5. **Resilient Upload Workflows**
   - CSV uploads must:
     - Validate headers & required fields.
     - Allow partial success and give row-level error feedback.
     - Not break Supabase schema integrity.
   - All uploads must create a version record first.

6. **Versioning Discipline**
   - Each dataset (Admin, Population, GIS) has a `_versions` table.
   - Only one version per dataset type can be active per country.
   - Replacements archive older data.
   - Linked/Active datasets cannot be hard-deleted.

7. **Testing & Verification**
   - Maintain sample datasets in `/tests/data/`.
   - Manual test each data upload and version selection for all dataset types.

8. **Feature Flags**
   - New or partial features hidden until validated and integrated into the workflow.

9. **UI Consistency**
   - All dataset pages (Admin, Population, GIS) use:
     - Dataset version table with dropdown actions
     - Upload, Edit, Delete, Template buttons
     - DatasetHealth and record tables
   - Styling follows GSC Red and Tailwind; no shadcn/ui.

---

## Workflow Rules

1. **Branch → Implement → Test → Verify green build → Merge**
2. **Never bypass `development-charter.md`**
3. Each commit should move the app forward, not sideways.

---

## Thread Transition
When starting a new ChatGPT thread:
- Attach this charter.
- Paste the “Next Thread Prompt” from below to ensure full project continuity.
