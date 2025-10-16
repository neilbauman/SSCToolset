"use client";
import { useState,useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Search, Plus, Tag } from "lucide-react";
import TaxonomyPicker from "@/app/configuration/taxonomy/TaxonomyPicker";
import CreateIndicatorInlineModal from "@/components/country/CreateIndicatorInlineModal";
const F="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]",S="inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm hover:bg-gray-50",L="block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";
export default function Step4Indicator({taxonomyIds,setTaxonomyIds,indicatorId,setIndicatorId}:{taxonomyIds:string[];setTaxonomyIds:any;indicatorId:string|null;setIndicatorId:any;}){
const[groups,setGroups]=useState<string[]>([]),[terms,setTerms]=useState<any[]>([]),[selectedGroup,setSelectedGroup]=useState(""),[selectedTerm,setSelectedTerm]=useState(""),[indicatorQuery,setIndicatorQuery]=useState(""),[indicatorList,setIndicatorList]=useState<any[]>([]),[createIndicatorOpen,setCreateIndicatorOpen]=useState(false);
async function loadTaxonomy(){const{data}=await supabase.from("taxonomy_terms").select("id,name,category").order("sort_order",{ascending:true});setTerms(data??[]);setGroups([...new Set((data??[]).map(t=>t.category))]);}
