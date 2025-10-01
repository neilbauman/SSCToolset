import { NextResponse } from "next/server";

export async function GET() {
  // Define headers
  const headers = ["name,pcode,level,parent_pcode,population"];
  // Provide a few sample rows
  const sample = [
    "Philippines,PHL,ADM0,,109581078",
    "Ilocos Region,PH01,ADM1,PHL,0",
    "Ilocos Norte,PH0102,ADM2,PH01,0",
  ];
  const csvContent = [headers, ...sample].join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=admin_units_template.csv",
    },
  });
}
