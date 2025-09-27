import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { listVersions } from "@/lib/services/framework";
import PrimaryFrameworkClient from "@/components/framework/PrimaryFrameworkClient";
import { groupThemes } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function PrimaryFrameworkPage({
  searchParams,
}: {
  searchParams?: { version?: string };
}) {
  const versions = await listVersions();
  const openedId = searchParams?.version ?? undefined;
  const theme = groupThemes["ssc-config"];

  return (
    <div>
      <PageHeader
        title="Primary Framework Editor"
        group="ssc-config"
        description="Manage framework versions created from the SSC catalogue."
        tool="Primary Framework Editor"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "SSC Configuration", href: "/configuration" },
              { label: "Primary Framework Editor" },
            ]}
          />
        }
      />

      {/* Versions selector */}
      <div className="mb-6 flex items-center gap-3">
        <label htmlFor="version" className="text-sm font-medium text-gray-700">
          Select Version:
        </label>
        <select
          id="version"
          name="version"
          defaultValue={openedId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            if (id) {
              window.location.href = `/configuration/primary?version=${id}`;
            } else {
              window.location.href = `/configuration/primary`;
            }
          }}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">-- Select a version --</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} {v.status === "draft" ? "(Draft)" : "(Published)"}
            </option>
          ))}
        </select>
      </div>

      {/* Framework Client */}
      <PrimaryFrameworkClient versions={versions} openedId={openedId} />
    </div>
  );
}
