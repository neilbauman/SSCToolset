// app/country/types.ts

/**
 * Shared props for all /country/[id] routes.
 * Compatible with Next.js 15 App Router.
 */
export type CountryPageProps = {
  params: {
    id: string;
  };
  searchParams?: Record<string, string | string[] | undefined>;
};
