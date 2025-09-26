import ToolCard from "@/components/ui/ToolCard";
import { groupThemes } from "@/lib/theme";
import { Layers, BookOpen, Settings, Library } from "lucide-react";

// ... tools array unchanged

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
  {tools.map((tool) => {
    const theme = groupThemes["ssc-config"];
    return (
      <ToolCard
        key={tool.id}
        href={tool.href}
        icon={tool.icon}
        title={tool.title}
        description={tool.description}
        border={theme.border}
        text={theme.text}
        hover={theme.hover}
      />
    );
  })}
</div>
