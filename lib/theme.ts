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
    text: "text-gray-600",
    hover: "hover:bg-gray-50",
    groupText: "text-gray-600",
  },
  about: {
    border: "border-blue-600",
    text: "text-blue-600",
    hover: "hover:bg-blue-50",
    groupText: "text-blue-600",
  },
  admin: {
    border: "border-gray-600",
    text: "text-gray-600",
    hover: "hover:bg-gray-50",
    groupText: "text-gray-600",
  },
  "ssc-config": {
    border: "border-red-600",
    text: "text-red-600",
    hover: "hover:bg-red-50",
    groupText: "text-red-600",
  },
  "country-config": {
    border: "border-green-600",
    text: "text-green-600",
    hover: "hover:bg-green-50",
    groupText: "text-green-600",
  },
  "ssc-instances": {
    border: "border-orange-500",
    text: "text-orange-500",
    hover: "hover:bg-orange-50",
    groupText: "text-orange-500",
  },
};

export const breadcrumbClasses = {
  base: "text-sm text-gray-600",
  link: "hover:underline",
  current: "font-semibold text-gray-900",
};
