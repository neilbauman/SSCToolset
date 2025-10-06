// /types/modals.ts

export type UploadModalProps = {
  /** Whether the modal is currently open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** ISO code of the selected country */
  countryIso: string;
  /** Optional callback fired when upload completes */
  onUploaded?: () => Promise<void> | void;
};
