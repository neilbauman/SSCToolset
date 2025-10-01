import Papa from "papaparse";

export function generatePopulationTemplate(): Blob {
  const example = [
    { pcode: "PH0101", population: 100000, last_updated: "2020-01-01" },
    { pcode: "PH0102", population: 75000, last_updated: "2020-01-01" },
  ];

  const csv = Papa.unparse(example, {
    columns: ["pcode", "population", "last_updated"],
  });

  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}
