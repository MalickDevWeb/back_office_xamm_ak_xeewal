export const runtime = 'nodejs';
export async function GET() {
  const error = new Error("Sentry Crash Test - Direct API");
  error.name = "TestError";
  throw error;
}
