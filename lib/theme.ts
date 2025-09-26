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
    border: "border-gray-600",
    text: "text-gray-700",
    hover: "hover:bg-gray-50",
    groupText: "text-gray-700",
  },
  about: {
    border: "border-[#004b87]",   // GSC institutional blue
    text: "text-[#004b87]",
    hover: "hover:bg-blue-50",
    groupText: "text-[#004b87]",
  },
  admin: {
    border: "border-gray-600",
    text: "text-gray-700",
    hover: "hover:bg-gray-50",
    groupText: "text-gray-700",
  },
  "ssc-config": {
    border: "border-[#004b87]",   // dark GSC blue instead of red
    text: "text-[#004b87]",
    hover: "hover:bg-blue-50",
    groupText: "text-[#004b87]",
  },
  "country-config": {
    border: "border-[#2e7d32]",   // GSC green
    text: "text-[#2e7d32]",
    hover: "hover:bg-green-50",
    groupText: "text-[#2e7d32]",
  },
  "ssc-instances": {
    border: "border-[#d35400]",   // GSC orange
    text: "text-[#d35400]",
    hover: "hover:bg-orange-50",
    groupText: "text-[#d35400]",
  },
};

export const breadcrumbClasses = {
  base: "text-sm text-gray-600",
  link: "hover:underline",
  current: "font-semibold text-gray-900",
};
