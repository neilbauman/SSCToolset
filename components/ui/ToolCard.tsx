import Link from "next/link";
import React from "react";

type ToolCardProps = {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  border: string;
  text: string;
  hover: string;
};

export default function ToolCard({
  href,
  icon: Icon,
  title,
  description,
  border,
  text,
  hover,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className={`rounded-lg bg-white shadow-sm p-6 transition-colors ${border} ${text} ${hover}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6" /> {/* centralized icon size */}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </Link>
  );
}
