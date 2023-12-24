export async function GET() {
  return Response.json({
    message: "Welcome to the Ben Key API!",
    directories: ["/tasket"],
  });
}
