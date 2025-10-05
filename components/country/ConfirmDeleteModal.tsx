"use client";

import React from "react";
import ModalBase from "@/components/ui/ModalBase";

type ConfirmDeleteModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDeleteModal({
  open,
  title = "Confirm Deletion",
  message,
  confirmLabel = "Delete",
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <ModalBase
      open={open}
      title={title}
      confirmLabel={confirmLabel}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {message}
    </ModalBase>
  );
}
