// lib/theme.ts
export type GroupKey =
  | "dashboard"
  | "about"
  | "admin"
  | "ssc-config"
  | "country-config"
  | "ssc-instances";

export const groupThemes: Record<GroupKey, { 
  color: string;       // Tailwind border/text class
  hover: string;       // Tailwind hover bg
  text: string;        // Tailwind text class
}> = {
  "dashboard": {
    color: "border-gray-600",
    hover: "hover:bg-gray-50",
    text: "text-gray-600",
  },
  "about": {
    color: "border-blue-600",
    hover: "hover:bg-blue-50",
    text: "text-blue-600",
  },
  "admin": {
    color: "border-gray-600",
    hover: "hover:bg-gray-50",
    text: "text-gray-600",
  },
  "ssc-config": {
    color: "border-red-600",
    hover: "hover:bg-red-50",
    text: "text-red-600",
  },
  "country-config": {
    color: "border-green-600",
    hover: "hover:bg-green-50",
    text: "text-green-600",
  },
  "ssc-instances": {
    color: "border-orange-500",
    hover: "hover:bg-orange-50",
    text: "text-orange-500",
  },
};

// Central breadcrumb classes
export const breadcrumbClasses = {
  base: "text-sm text-gray-600",
  link: "hover:underline",
  current: "font-semibold text-gray-900",
};
