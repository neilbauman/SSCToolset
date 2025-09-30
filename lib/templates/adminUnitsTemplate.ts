import * as XLSX from "xlsx";

export function generateAdminUnitsTemplate() {
  // Define headers
  const headers = [
    "pcode",
    "name",
    "level",
    "parent_pcode",
    "population",
    "last_updated",
    "metadata",
  ];

  // Example rows to guide users
  const sampleData = [
    {
      pcode: "PHL-01",
      name: "Ilocos Region",
      level: "ADM1",
      parent_pcode: "",
      population: "",
      last_updated: "2020-05-01",
      metadata: '{"source": "NSO"}',
    },
    {
      pcode: "PHL-0101",
      name: "Ilocos Norte",
      level: "ADM2",
      parent_pcode: "PHL-01",
      population: "",
      last_updated: "2020-05-01",
      metadata: "",
    },
    {
      pcode: "PHL-010101",
      name: "Bacarra",
      level: "ADM3",
      parent_pcode: "PHL-0101",
      population: "",
      last_updated: "2020-05-01",
      metadata: "",
    },
    {
      pcode: "PHL-01010101",
      name: "Cadaratan",
      level: "ADM4",
      parent_pcode: "PHL-010101",
      population: 1212,
      last_updated: "2020-05-01",
      metadata: '{"urban_rural": "R"}',
    },
  ];

  // Convert JSON → worksheet
  const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "AdminUnitsTemplate");

  // Trigger download
  XLSX.writeFile(workbook, "admin_units_template.xlsx");
}
