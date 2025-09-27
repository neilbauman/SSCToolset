import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Admin"
        group="admin"
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

      <div className="prose max-w-none mt-4">
        <p>
          Future space for user management, permissions, and administration of the SSC Toolset.
        </p>
      </div>
    </div>
  );
}
