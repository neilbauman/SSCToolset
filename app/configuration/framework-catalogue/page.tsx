// app/configuration/framework-catalogue/page.tsx
// Clean wrapper for Framework Catalogue configuration view

import CataloguePage from "@/components/configuration/framework-catalogue/CataloguePage";

/**
 * Framework Catalogue Page
 * 
 * This page renders the master catalogue for Pillars, Themes, and Subthemes.
 * The page component itself does not add its own layout wrapper — 
 * CataloguePage already includes SidebarLayout and breadcrumbs.
 */
export default function FrameworkCataloguePage() {
  return <CataloguePage />;
}
