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
