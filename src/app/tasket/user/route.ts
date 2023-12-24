import { DBClient } from "../Database";

export async function GET(req: Request) {
  try {
    const collection = await DBClient.getCollection();
    const userData = await collection.extractToken(req).getUser();

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

    const collection = await DBClient.getCollection();
    const token = await collection.createUser(email, password);

    return Response.json({ message: "Successfully created new user.", token });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
