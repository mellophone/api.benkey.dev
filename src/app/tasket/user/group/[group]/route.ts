import { NextRequest } from "next/server";
import { DBClient } from "../../../Database";

export async function PATCH(
  req: Request,
  { params }: { params: { group: string } }
) {
  try {
    const body = await req.json();

    const { group } = params;
    if (!group) throw Error("Group name not provided.");

    const collection = await DBClient.getCollection();
    await collection.extractToken(req).updateGroup(group, body, body.name);

    return Response.json({ message: "Successfully updated group." });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { group: string } }
) {
  try {
    const { group } = params;
    if (!group) throw Error("Group name not provided.");

    const collection = await DBClient.getCollection();
    await collection.extractToken(req).deleteGroup(group);

    return Response.json({ message: "Successfully deleted group." });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
