// Override Next.js' PageProps constraint for client components
declare module "next" {
  export interface PageProps {
    params?: Record<string, string>;
  }
}
