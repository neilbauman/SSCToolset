import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Users & Auth (stub)"
        breadcrumbs={<Breadcrumbs items={[{ label: "Admin" }]} />}
      />
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm text-gray-700">Admin features will be added later.</p>
      </div>
    </div>
  );
}
