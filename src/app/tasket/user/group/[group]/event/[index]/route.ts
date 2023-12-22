import { DBClient } from "../../../../../Database";

export async function PATCH(
  req: Request,
  { params }: { params: { group: string; index: string } }
) {
  try {
    const body = await req.json();

    const { group, index } = params;
    const eventIndex = parseInt(index);

    if (Number.isNaN(eventIndex)) throw Error("Event index is invalid.");

    const collection = await DBClient.getCollection();
    await collection.extractToken(req).updateEvent(group, eventIndex, body);

    return Response.json({ message: "Successfully updated event." });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { group: string; index: string } }
) {
  try {
    const { group, index } = params;
    const eventIndex = parseInt(index);

    if (Number.isNaN(eventIndex)) throw Error("Event index is invalid.");

    const collection = await DBClient.getCollection();
    await collection.extractToken(req).deleteEvent(group, eventIndex);

    return Response.json({ message: "Successfully deleted event." });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
