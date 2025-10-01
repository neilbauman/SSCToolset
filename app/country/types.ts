// app/country/types.ts

/**
 * Shared dynamic route params for all /country/[id] pages.
 * Keeps typing stable in Next.js 15.
 */
export type CountryParams = {
  id: string;
};
