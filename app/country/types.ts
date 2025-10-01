/**
 * Shared Next.js App Router page props for country routes.
 */
export type CountryPageProps = {
  params: {
    id: string; // Country ISO or internal identifier
  };
  searchParams?: { [key: string]: string | string[] | undefined };
};
