"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface CreateDerivedDatasetWizardProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

/**
 * CreateDerivedDatasetWizard
 *
 * Tailwind-only wizard for composing derived datasets from multiple sources.
 * It does NOT use shadcn/ui, only your repo’s Modal and Button components.
 */
export default function CreateDerivedDatasetWizard({
  open,
  onClose,
  onSave,
}: CreateDerivedDatasetWizardProps) {
  const [step, setStep] = useState(1);

  return (
    <Modal open={open} onClose={onClose} title="Create Derived Dataset">
      <div className="space-y-5 text-sm text-gray-700">
        {/* Step 1 — Select Datasets */}
        {step === 1 && (
          <>
            <h3 className="text-base font-medium">Step 1: Select Datasets</h3>
            <p>Select at least two datasets to use in your derived calculation.</p>
            <div className="p-3 border rounded bg-gray-50">
              <p className="italic text-gray-500">
                Dataset selector placeholder — will list available datasets for
                this country.
              </p>
            </div>
          </>
        )}

        {/* Step 2 — Define Join Rules */}
        {step === 2 && (
          <>
            <h3 className="text-base font-medium">Step 2: Define Join Rules</h3>
            <p>
              Define how the selected datasets align — matching admin levels,
              time periods, and Pcodes.
            </p>
            <div className="p-3 border rounded bg-gray-50">
              <p className="italic text-gray-500">
                Join preview and alignment configuration will appear here.
              </p>
            </div>
          </>
        )}

        {/* Step 3 — Define Formula */}
        {step === 3 && (
          <>
            <h3 className="text-base font-medium">Step 3: Define Calculation</h3>
            <p>
              Create a formula combining selected indicators (for example:
              “Population / Area = Density”).
            </p>
            <div className="p-3 border rounded bg-gray-50">
              <p className="italic text-gray-500">
                Formula builder and derived indicator metadata placeholder.
              </p>
            </div>
          </>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <>
            <h3 className="text-base font-medium">Step 4: Review & Confirm</h3>
            <p>Review your configuration before generating the dataset.</p>
            <div className="p-3 border rounded bg-gray-50">
              <p className="italic text-gray-500">
                A summary of join and formula configuration will appear here.
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          {step > 1 ? (
            <Button
              onClick={() => setStep(step - 1)}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Back
            </Button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (onSave) onSave();
                onClose();
              }}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Save Derived Dataset
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
