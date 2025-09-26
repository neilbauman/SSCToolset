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
  {
    label: string;
    border: string;
    text: string;
    hover: string;
    groupText: string;
  }
> = {
  dashboard: {
    label: "Dashboard",
    border: "border border-[color:var(--gsc-gray)]",
    text: "text-[color:var(--gsc-gray)]",
    hover: "hover:bg-gray-50",
    groupText: "text-[color:var(--gsc-gray)]",
  },
  about: {
    label: "About",
    border: "border border-[color:var(--gsc-blue)]",
    text: "text-[color:var(--gsc-blue)]",
    hover: "hover:bg-blue-50",
    groupText: "text-[color:var(--gsc-blue)]",
  },
  admin: {
    label: "Admin",
    border: "border border-[color:var(--gsc-gray)]",
    text: "text-[color:var(--gsc-gray)]",
    hover: "hover:bg-gray-50",
    groupText: "text-[color:var(--gsc-gray)]",
  },
  "ssc-config": {
    label: "SSC Configuration",
    border: "border border-[color:var(--gsc-blue)]", // ✅ colored outline
    text: "text-[color:var(--gsc-blue)]",
    hover: "hover:bg-blue-50",
    groupText: "text-[color:var(--gsc-blue)]",
  },
  "country-config": {
    label: "Country Configuration",
    border: "border border-[color:var(--gsc-green)]",
    text: "text-[color:var(--gsc-green)]",
    hover: "hover:bg-green-50",
    groupText: "text-[color:var(--gsc-green)]",
  },
  "ssc-instances": {
    label: "SSC Instances",
    border: "border border-[color:var(--gsc-orange)]",
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
