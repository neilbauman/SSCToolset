// lib/theme.ts

export type GroupKey =
  | "dashboard"
  | "about"
  | "admin"
  | "ssc-config"
  | "country-config"
  | "ssc-instances";

export const groupThemes: Record<
  GroupKey,
  { border: string; text: string; hover: string; groupText: string }
> = {
  dashboard: {
    border: "border-[color:var(--gsc-gray)]",
    text: "text-[color:var(--gsc-gray)]",
    hover: "hover:bg-gray-50",
    groupText: "text-[color:var(--gsc-gray)]",
  },
  about: {
    border: "border-[color:var(--gsc-blue)]",
    text: "text-[color:var(--gsc-blue)]",
    hover: "hover:bg-blue-50",
    groupText: "text-[color:var(--gsc-blue)]",
  },
  admin: {
    border: "border-[color:var(--gsc-gray)]",
    text: "text-[color:var(--gsc-gray)]",
    hover: "hover:bg-gray-50",
    groupText: "text-[color:var(--gsc-gray)]",
  },
  "ssc-config": {
    border: "border-[color:var(--gsc-blue)]",
    text: "text-[color:var(--gsc-blue)]",
    hover: "hover:bg-blue-50",
    groupText: "text-[color:var(--gsc-blue)]",
  },
  "country-config": {
    border: "border-[color:var(--gsc-green)]",
    text: "text-[color:var(--gsc-green)]",
    hover: "hover:bg-green-50",
    groupText: "text-[color:var(--gsc-green)]",
  },
  "ssc-instances": {
    border: "border-[color:var(--gsc-orange)]",
    text: "text-[color:var(--gsc-orange)]",
    hover: "hover:bg-orange-50",
    groupText: "text-[color:var(--gsc-orange)]",
  },
};

export const breadcrumbClasses = {
  base: "text-sm text-gray-600",
  link: "hover:underline",
  current: "font-semibold text-gray-900",
};
