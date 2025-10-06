// /types/modals.ts

export type UploadGISModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  datasetVersionId?: string;
  onUploaded?: () => void;
};

// Backward-compatibility alias for older modals
export type UploadModalProps = UploadGISModalProps;
