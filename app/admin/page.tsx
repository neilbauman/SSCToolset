import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        group="admin"   // ✅ lowercase key
        description="Administrative SSC tools"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Admin" },
            ]}
          />
        }
      />

      <div className="mt-4 prose">
        <p>
          This area will support future administrative features, including user
          management and permissions.
        </p>
      </div>
    </div>
  );
}
