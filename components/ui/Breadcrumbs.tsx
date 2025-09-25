import Link from "next/link";

type Crumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-sm text-gray-600 mb-2">
      <ol className="flex items-center gap-2">
        {items.map((c, i) => (
          <li key={i} className="flex items-center">
            {c.href ? (
              <Link href={c.href} className="hover:underline">{c.label}</Link>
            ) : (
              <span className="text-gray-800">{c.label}</span>
            )}
            {i < items.length - 1 && <span className="mx-2 text-gray-400">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
