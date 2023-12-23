import { DBClient } from "../../../../../Database";
import { validatePartialAssignmentData } from "../assignmentTypes";

export async function PATCH(
  req: Request,
  { params }: { params: { group: string; index: string } }
) {
  try {
    const body = await req.json();

    const { group, index } = params;

    const assignmentIndex = parseInt(index);
    if (Number.isNaN(assignmentIndex))
      throw Error("Assignment index is invalid.");

    const partialAssignmentData = validatePartialAssignmentData(body);

    const collection = await DBClient.getCollection();
    await collection
      .extractToken(req)
      .updateAssignment(group, assignmentIndex, partialAssignmentData);

    return Response.json({ message: "Successfully updated assignment." });
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

    const assignmentIndex = parseInt(index);
    if (Number.isNaN(assignmentIndex))
      throw Error("Assignment index is invalid.");

    const collection = await DBClient.getCollection();
    await collection.extractToken(req).deleteAssignment(group, assignmentIndex);

    return Response.json({ message: "Successfully deleted assignment." });
  } catch (e) {
    const errorMessage = `${e}`.substring(`${e}`.indexOf(" ") + 1);
    return Response.json({ errors: [errorMessage] }, { status: 400 });
  }
}
