import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
      <ol className="flex space-x-2">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center">
              {!isLast && item.href ? (
                <Link
                  href={item.href}
                  className="text-brand-700 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900">
                  {item.label}
                </span>
              )}
              {idx < items.length - 1 && (
                <span className="mx-2 text-gray-400">/</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
