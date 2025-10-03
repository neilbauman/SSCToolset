"use client";

type DatasetHealthProps = {
  totalUnits: number;
  validPcodeCount?: number;   // Admins: # of units with pcodes
  validPopulationCount?: number; // Population: # of rows with population values
  validCRSCount?: number;     // GIS: # of layers with valid CRS
  validFeatureCount?: number; // GIS: # of layers with valid feature counts
};

export default function DatasetHealth({
  totalUnits,
  validPcodeCount,
  validPopulationCount,
  validCRSCount,
  validFeatureCount,
}: DatasetHealthProps) {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-2">Dataset Health</h3>
      <p className="text-sm">Total Records – {totalUnits}</p>

      {validPcodeCount !== undefined && (
        <p className="text-sm">
          Records with valid Pcodes – {validPcodeCount} / {totalUnits}
        </p>
      )}

      {validPopulationCount !== undefined && (
        <p className="text-sm">
          Records with population values – {validPopulationCount} / {totalUnits}
        </p>
      )}

      {validCRSCount !== undefined && (
        <p className="text-sm">
          Layers with valid CRS – {validCRSCount} / {totalUnits}
        </p>
      )}

      {validFeatureCount !== undefined && (
        <p className="text-sm">
          Layers with features – {validFeatureCount} / {totalUnits}
        </p>
      )}
    </div>
  );
}
