import ToolCard from "@/components/ui/ToolCard";
import { groupThemes } from "@/lib/theme";
import { Info, Settings, Layers, Globe, BarChart } from "lucide-react";

// ... groups array unchanged

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
  {groups.map((g) => {
    const theme = groupThemes[g.id as keyof typeof groupThemes];
    return (
      <ToolCard
        key={g.id}
        href={g.href}
        icon={g.icon}
        title={g.title}
        description={g.description}
        border={theme.border}
        text={theme.text}
        hover={theme.hover}
      />
    );
  })}
</div>
