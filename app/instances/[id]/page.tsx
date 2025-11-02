"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CompositePreview from "@/components/instances/CompositePreview";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function InstancePage() {
  const params = useParams();
  const instanceId = params?.id as string;

  const [instanceName, setInstanceName] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstance = async () => {
      const { data } = await supabase
        .from("instances_list")
        .select("title")
        .eq("id", instanceId)
        .single();
      if (data) setInstanceName(data.title);
    };
    if (instanceId) fetchInstance();
  }, [instanceId]);

  const headerProps = {
    title: instanceName || "Instance Details",
    group: "country-config" as const,
    description: "Review and manage composite vulnerability analysis.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: "/country" },
          { label: "Instances", href: "/instances" },
          { label: instanceName || "Instance" },
        ]}
      />
    ),
  };

  const categories = [
    { key: "underlying_vulnerability", label: "Underlying Vulnerabilities" },
    { key: "hazard", label: "Hazards" },
    { key: "ssc_pillar", label: "SSC Pillars" },
  ];

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <CompositePreview
            key={cat.key}
            instanceId={instanceId}
            category={cat.key}
          />
        ))}
      </div>
    </SidebarLayout>
  );
}
