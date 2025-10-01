import { NextResponse } from "next/server";

export async function GET() {
  const headers = ["pcode,name,population,year,source"];
  const sample = [
    "PH0102801001,Adams,2020,2020,Philippine Statistics Authority",
    ",Some Municipality,15000,2015,National Census Office"
  ];
  const csvContent = [headers, ...sample].join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition":
        "attachment; filename=population_template.csv",
    },
  });
}
