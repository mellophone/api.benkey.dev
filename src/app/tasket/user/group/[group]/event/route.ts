import { DBClient, EventRecurrenceArray } from "../../../../Database";

export async function POST(
  req: Request,
  { params }: { params: { group: string } }
) {
  try {
    const body = await req.json();

    const { name, description, start_date, end_date, schedule } = body;
    if (!name) throw Error("Event name not provided.");
    if (!description) throw Error("Event description not provided.");
    if (!start_date) throw Error("Event start date not provided.");
    if (!end_date) throw Error("Event end date not provided.");

    if (schedule && !schedule.recurs)
      throw Error("Schedule recur value not provided.");
    if (schedule && !EventRecurrenceArray.find((r) => r === schedule.recurs))
      throw Error("Schedule recur value invalid.");
    if (schedule && !schedule.recurs_until)
      throw Error("Schedule recurs until value not provided.");

    const collection = await DBClient.getProtectedDBCollection(req);
    await collection.createEvent(params.group, body);

    return Response.json({ message: "Successfully created new event." });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
