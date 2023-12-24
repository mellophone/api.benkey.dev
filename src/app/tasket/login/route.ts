import { DBClient } from "../Database";
import { tokenCookieName } from "../../../constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email, password } = body;

    if (!email || !password) throw Error("Email and/or password not provided.");

    const collection = await DBClient.getCollection();
    const token = await collection.login(email, password);

    const tokenCookie = `${tokenCookieName}=${token}; Secure; HttpOnly; SameSite=Strict`;

    const res = Response.json({ message: "Successfully logged in." });
    res.headers.append("Set-Cookie", tokenCookie);

    return res;
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
