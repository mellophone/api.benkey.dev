import { DBClient } from "../../Database";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, color } = body;
    if (!name) throw Error("Group name not provided.");

    const collection = await DBClient.getCollection();
    await collection.extractToken(req).createGroup(name, color);

    return Response.json({ message: "Successfully created new group." });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
