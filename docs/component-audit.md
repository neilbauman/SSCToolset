# SSC Toolset – Component Audit

_Last updated: [insert date when you run audit]_

This document tracks the status of all files under `/components` and related shared UI utilities.  
Goal: ensure every component is **active, necessary, and future-proof**, per the Development Charter rules.

---

## 🧩 1. Audit Overview

| Category | Description |
|-----------|--------------|
| 🟢 Active | Used directly in current build or imported by other active components |
| 🟡 Legacy | Compiles successfully but not used in current app routes (potentially replaceable or obsolete) |
| 🔴 Dead   | Not referenced anywhere; safe to archive or remove after verification |

---

## 🧭 2. Folder Inventory

| Folder | Summary | Next Steps |
|--------|----------|------------|
| `/components/common/` | [describe contents briefly] | TBD |
| `/components/country/` | Country configuration pages (Admin, Pop, GIS, Joins) | Likely Active |
| `/components/framework/` | [describe usage or note if unused] | TBD |
| `/components/layout/` | SidebarLayout, PageHeader, etc. | Confirm all imported |
| `/components/ui/` | Buttons, Breadcrumbs, ModalBase, etc. | Consolidation target |

---

## 🔍 3. Component Reference Matrix

| Component Path | Description | Referenced In | Status | Notes |
|----------------|-------------|----------------|---------|-------|
| `/components/country/ConfirmDeleteModal.tsx` | Standard delete confirmation modal | `/app/country/[id]/admins/page.tsx` | 🟢 Active | Now refactored to use ModalBase |
| `/components/ui/ModalBase.tsx` | Shared modal layout | All modals | 🟢 Active | New canonical base |
| `/components/layout/SidebarLayout.tsx` | Page shell layout | All main pages | 🟢 Active | Core layout component |
| `/components/framework/...` | (fill in) | | 🟡 Legacy | verify usage |
| `/components/common/...` | (fill in) | | 🔴 Dead | candidate for archive |

_Add entries as you verify imports or usage across routes._

---

## 🧠 4. Observations

- **Duplication:** Identify components that repeat layout or logic (e.g., multiple modals, form wrappers).
- **Coupling:** Note if some components are too tightly bound to page logic (e.g., directly using Supabase instead of props).
- **Opportunity:** Suggest which ones could be refactored into `/ui/` for reuse.

---

## 🧱 5. Planned Actions

| Action | Description | Target Folder | Owner | Priority |
|---------|--------------|---------------|--------|-----------|
| Archive unused framework components | Move to `/archive/framework/` | `/framework` | TBD | Medium |
| Merge duplicate modals | Use `ModalBase` for all | `/ui/` | TBD | High |
| Rename inconsistent files | Standardize PascalCase for all components | All | TBD | Low |
| Create unified Table component | Reuse for Admin/Pop/GIS lists | `/ui/` | TBD | Medium |

---

## ✅ 6. Rules of Cleanup (from Development Charter)

1. Never delete code permanently — archive instead (`/archive/`).
2. Never break a green build for cleanup work.
3. Document every relocation in this file before merging.
4. Prefer refactor → archive → replace, not “delete + rebuild.”

---

## 🕒 7. Audit Schedule

| Phase | Target Date | Scope |
|--------|--------------|--------|
| Phase 1 | After GIS workflow merge | Passive audit + tagging |
| Phase 2 | After Joins page stable | Archive and refactor |
| Phase 3 | Pre-v1 release | Final cleanup and doc alignment |

---

### 📌 Notes

- Keep this file **version-controlled** (committed to Git).  
- Update it each time you add, move, or refactor a component.  
- The audit log becomes part of the project’s reproducibility record.

---
