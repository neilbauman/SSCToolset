import React from "react";
import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav className="text-sm text-gray-600">
      <ol className="flex items-center space-x-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center">
            {item.href && idx < items.length - 1 ? (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : idx === items.length - 1 ? (
              <span className="font-semibold text-gray-900">{item.label}</span>
            ) : (
              <span>{item.label}</span>
            )}
            {idx < items.length - 1 && <span className="mx-2">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
