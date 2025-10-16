// Route: /country/[id]/datasets/add
import DatasetWizard from "../DatasetWizard";

export default function AddDatasetPage({ params }: { params: { id: string } }) {
  return <DatasetWizard params={params} />;
}
