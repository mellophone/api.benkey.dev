import { DBClient } from "../../../../Database";
import { validateAssignmentData } from "./assignmentTypes";

export async function POST(
  req: Request,
  { params }: { params: { group: string } }
) {
  try {
    const body = await req.json();
    const assignmentData = validateAssignmentData(body);

    const collection = await DBClient.getCollection();
    await collection
      .extractToken(req)
      .createAssignment(params.group, assignmentData);

    return Response.json({
      message: "Successfully created new assignment.",
    });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
