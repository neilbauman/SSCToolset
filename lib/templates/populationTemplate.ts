import Papa from "papaparse";

export function generatePopulationTemplate() {
  const template = [
    {
      pcode: "PH0102802001",
      population: "12345",
      households: "2500",
      dataset_date: "2020-01-01",
    },
    {
      pcode: "PH0102802002",
      population: "6789",
      households: "1300",
      dataset_date: "2020-01-01",
    },
  ];

  const csv = Papa.unparse(template);
  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}
