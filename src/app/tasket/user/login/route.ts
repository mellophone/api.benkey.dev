import { DBClient } from "../../Database";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email, password } = body;

    if (!email || !password) throw Error("Email and/or password not provided.");

    const collection = await DBClient.getDBCollection();
    const tokenCookie = await collection.login(email, password);

    return Response.json(
      { message: "Successfully logged in." },
      { headers: [["Set-Cookie", tokenCookie]] }
    );
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
