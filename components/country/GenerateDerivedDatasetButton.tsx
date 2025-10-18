"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Brain } from "lucide-react";

export default function GenerateDerivedDatasetButton({
  countryIso,
  onComplete,
}: {
  countryIso: string;
  onComplete?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setStatus(null);

    const { data, error } = await supabase
      .rpc("create_population_density_derived", { p_country_iso: countryIso });

    if (error) {
      console.error("RPC error:", error);
      setStatus("❌ Error generating dataset");
    } else {
      setStatus("✅ Population Density (ADM3) dataset created!");
      if (onComplete) onComplete();
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Generating...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4" /> Generate Population Density
          </>
        )}
      </button>
      {status && (
        <p
          className={`text-sm ${
            status.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
