import type { CountryParams } from "./country";

declare module "next" {
  interface PageProps {
    params?: CountryParams | Promise<CountryParams>;
  }
}
