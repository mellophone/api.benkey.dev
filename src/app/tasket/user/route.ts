import { DBClient } from "../Database";

export async function GET(req: Request) {
  try {
    const collection = await DBClient.getProtectedDBCollection(req);
    const userData = await collection.getUser();

    return Response.json(userData);
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email, password } = body;

    if (!email || !password) throw Error("Email and/or password not provided.");

    const collection = await DBClient.getDBCollection();
    const tokenCookie = await collection.createUser(email, password);

    return Response.json(
      { message: "Successfully created new user." },
      { headers: [["Set-Cookie", tokenCookie]] }
    );
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
