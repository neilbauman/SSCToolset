"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddTaxonomyTermModal from "@/components/configuration/taxonomy/AddTaxonomyTermModal";
import EditTaxonomyTermModal from "@/components/configuration/taxonomy/EditTaxonomyTermModal";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
  Save,
} from "lucide-react";

type Term = {
  id: string;
  parent_id: string | null;
  category: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  category_order: number | null;
  created_at?: string;
  updated_at?: string;
};

type TermsByCategory = Record<string, Term[]>;

export default function TaxonomyPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [byCat, setByCat] = useState<TermsByCategory>({});
  const [loading, setLoading] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);

  const headerProps = {
    title: "Taxonomy Manager",
    group: "ssc-config" as const,
    description:
      "Create, edit, and order taxonomy groups and terms used across the toolset.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Configuration", href: "/configuration" },
          { label: "Taxonomy" },
        ]}
      />
    ),
  };

  useEffect(() => {
    loadTerms();
  }, []);

  async function loadTerms() {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select(
        "id,parent_id,category,code,name,description,sort_order,category_order,created_at,updated_at"
      )
      .order("category_order", { ascending: true, nullsFirst: true })
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load taxonomy_terms:", error);
      setTerms([]);
      setByCat({});
      setLoading(false);
      return;
    }

    const list = (data || []).map((t) => ({
      ...t,
      sort_order: t.sort_order ?? 0,
      category_order: t.category_order ?? 0,
    })) as Term[];

    // group by category
    const grouped: TermsByCategory = {};
    for (const t of list) {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    }
    Object.keys(grouped).forEach((cat) => {
      grouped[cat].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name)
      );
    });

    setTerms(list);
    setByCat(grouped);
    setLoading(false);
  }

  /** Save within-category order */
  async function saveOrderForCategory(category: string) {
    const list = (byCat[category] || []).map((t, idx) => ({
      ...t,
      sort_order: idx,
    }));
    const updates = list.map((t) =>
      supabase
        .from("taxonomy_terms")
        .update({ sort_order: t.sort_order })
        .eq("id", t.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("Failed to update sort order:", failed.error);
      alert("Failed to save order.");
    } else {
      await loadTerms();
    }
  }

  /** Move term within a category (local only until Save) */
  function moveWithinCategory(category: string, id: string, dir: "up" | "down") {
    setByCat((prev) => {
      const copy = { ...prev };
      const arr = [...(copy[category] || [])];
      const idx = arr.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= arr.length) return prev;
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      copy[category] = arr.map((t, i) => ({ ...t, sort_order: i }));
      return copy;
    });
  }

  /** Delete term */
  async function deleteTerm(term: Term) {
    if (
      !confirm(
        `Delete taxonomy term "${term.name}"?\n\nAny indicator links to this term will also be removed.`
      )
    )
      return;

    const { error: linkErr } = await supabase
      .from("indicator_taxonomy_links")
      .delete()
      .eq("term_id", term.id);
    if (linkErr) {
      console.error("Failed to remove term links:", linkErr);
      alert("Could not remove linked indicators.");
      return;
    }

    const { error } = await supabase
      .from("taxonomy_terms")
      .delete()
      .eq("id", term.id);
    if (error) {
      console.error("Failed to delete term:", error);
      alert("Delete failed.");
    } else {
      await loadTerms();
    }
  }

  /** Category-level reordering */
  const categories = useMemo(() => {
    const cats = Object.keys(byCat).map((cat) => ({
      name: cat,
      order: byCat[cat][0]?.category_order ?? 0,
    }));
    return cats.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [byCat]);

  async function moveCategory(name: string, dir: "up" | "down") {
    if (categories.length < 2) return;
    const currentIdx = categories.findIndex((c) => c.name === name);
    const swapIdx = dir === "up" ? currentIdx - 1 : currentIdx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const reordered = [...categories];
    [reordered[currentIdx], reordered[swapIdx]] = [
      reordered[swapIdx],
      reordered[currentIdx],
    ];

    // persist new order
    await Promise.all(
      reordered.map((cat, idx) =>
        supabase
          .from("taxonomy_terms")
          .update({ category_order: idx })
          .eq("category", cat.name)
      )
    );
    await loadTerms();
  }

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--gsc-blue)" }}
        >
          Taxonomy
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTerms}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border"
            title="Reload"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md"
            style={{ background: "var(--gsc-blue)", color: "white" }}
          >
            <Plus className="w-4 h-4" />
            Add Term
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading taxonomy…
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No taxonomy terms yet.</p>
      ) : (
        <div className="space-y-6">
          {categories.map((cat, catIdx) => {
            const list = byCat[cat.name] || [];
            return (
              <div key={cat.name} className="bg-white border rounded-md">
                {/* Category header with reordering controls */}
                <div
                  className="flex justify-between items-center px-3 py-2 border-b text-sm font-semibold"
                  style={{
                    background: "var(--gsc-beige)",
                    color: "var(--gsc-gray)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                      disabled={catIdx === 0}
                      onClick={() => moveCategory(cat.name, "up")}
                      title="Move category up"
                    >
                      <ArrowUp
                        className={`w-4 h-4 ${
                          catIdx === 0 ? "text-gray-300" : "text-gray-600"
                        }`}
                      />
                    </button>
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                      disabled={catIdx === categories.length - 1}
                      onClick={() => moveCategory(cat.name, "down")}
                      title="Move category down"
                    >
                      <ArrowDown
                        className={`w-4 h-4 ${
                          catIdx === categories.length - 1
                            ? "text-gray-300"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Terms list */}
                <ul className="divide-y">
                  {list.map((t, idx) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 px-3 py-2 text-sm"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {t.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t.code}{" "}
                          {t.description ? `• ${t.description}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                          disabled={idx === 0}
                          onClick={() =>
                            moveWithinCategory(cat.name, t.id, "up")
                          }
                          title="Move up"
                        >
                          <ArrowUp
                            className={`w-4 h-4 ${
                              idx === 0 ? "text-gray-300" : "text-gray-600"
                            }`}
                          />
                        </button>
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                          disabled={idx === list.length - 1}
                          onClick={() =>
                            moveWithinCategory(cat.name, t.id, "down")
                          }
                          title="Move down"
                        >
                          <ArrowDown
                            className={`w-4 h-4 ${
                              idx === list.length - 1
                                ? "text-gray-300"
                                : "text-gray-600"
                            }`}
                          />
                        </button>
                        <button
                          onClick={async () =>
                            await saveOrderForCategory(cat.name)
                          }
                          className="px-2 py-1 text-xs rounded border hover:bg-gray-50"
                          title="Save order"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditing(t)}
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                          title="Edit term"
                        >
                          <Edit2
                            className="w-4 h-4"
                            style={{ color: "var(--gsc-blue)" }}
                          />
                        </button>
                        <button
                          onClick={() => deleteTerm(t)}
                          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                          title="Delete term"
                        >
                          <Trash2
                            className="w-4 h-4"
                            style={{ color: "var(--gsc-red)" }}
                          />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {openAdd && (
        <AddTaxonomyTermModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          onSaved={loadTerms}
          existingCategories={categories.map((c) => c.name)}
        />
      )}
      {editing && (
        <EditTaxonomyTermModal
          open={!!editing}
          onClose={() => setEditing(null)}
          onSaved={loadTerms}
          term={editing}
          existingCategories={categories.map((c) => c.name)}
        />
      )}
    </SidebarLayout>
  );
}
