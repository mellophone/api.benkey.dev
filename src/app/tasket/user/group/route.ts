import { DBClient } from "../../Database";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, color, type } = body;
    if (!name) throw Error("Group name not provided.");

    const collection = await DBClient.getProtectedDBCollection(req);
    await collection.createGroup(name, color, type);

    return Response.json({ message: "Successfully created new group." });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
