export async function GET() {
  return new Response("✅ proxy-upload route is live", {
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(req: Request) {
  return new Response("✅ proxy-upload POST received", {
    headers: { "Content-Type": "text/plain" },
  });
}
