import { redirect } from "next/navigation";

export default function LegacyRedirect({ params }: { params: { id: string } }) {
  redirect(`/country/${params.id}`);
}
