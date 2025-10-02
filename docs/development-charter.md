# SSC Toolset – Development Charter

This document defines the rules of development for the SSC Toolset project.  
Goal: prevent project drift, ensure stable forward progress, and maintain reproducibility.

---

## Principles

1. **Green First, Grow Later**
   - Never merge broken code. Vercel build must be green before new features.

2. **No Drift**
   - All changes must align with `project-overview.md`.
   - If new ideas appear, log them in `future-enhancements.md`.

3. **Incremental Development**
   - Favor small additive commits over whole-file rewrites.
   - Archive old files in `/archive/` if replacing.

4. **Typed Interfaces**
   - Shared types (`Country`, `AdminUnit`, `PopulationRow`, `GISLayer`) live in `/types`.
   - No ad-hoc redefinitions.

5. **Resilient Data Uploads**
   - Validate inputs, accept partial success, show user errors.
   - Do not break the DB with invalid rows.

6. **Versioning of Data**
   - Replace → archive as new version. Never destroy old data.

7. **Test Harness**
   - Maintain sample datasets in `/tests/data/`.
   - Use them to manually verify uploads/rendering after changes.

8. **Feature Flags**
   - Hide incomplete features behind flags until stable.

---

## Workflow

1. Spec → Branch → Implement increment → Upload sample → Verify green build → Merge.
2. Do not bypass `development-charter.md`.
