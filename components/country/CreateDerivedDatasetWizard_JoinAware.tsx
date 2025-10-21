'use client';

import { useEffect, useMemo, useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';
import {
  simulateJoinPreview,
  createDerivedDataset,
  loadDatasetOptions,
  loadTaxonomyTerms,
} from '@/lib/supabase/derived';
import type { DatasetOption, Method, PreviewRow, TaxonomyTerm } from '@/lib/supabase/types';

type Props = {
  countryIso: string;
  defaultAdminLevel?: string;
  defaultYear?: number;
  onClose?: () => void;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  countryIso,
  defaultAdminLevel = 'ADM3',
  defaultYear = new Date().getFullYear(),
  onClose,
}: Props) {
  const router = useRouter();

  // --- state declarations unchanged ---

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser;          // ✅ fixed
      const [ds, tx] = await Promise.all([
        loadDatasetOptions(sb, countryIso),
        loadTaxonomyTerms(sb),
      ]);
      setDatasets(ds);
      setTaxonomy(tx);
    })().catch(console.error);
  }, [countryIso]);

  // --- rest of file identical to last working version, 
  // except: every "const sb = supabase();" → "const sb = supabaseBrowser;" ---
}
