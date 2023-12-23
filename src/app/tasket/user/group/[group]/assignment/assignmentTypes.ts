import {
  getPartialObjectData,
  validatePartialData,
  validateData,
  StringAttributes,
  TimestampAttributes,
  OptionAttributes,
} from "../../../../types";

const AssignmentStringArray = ["name", "description"] as const;
const AssignmentTimestampArray = ["start_date", "end_date"] as const;
const AssignmentOptionMap = {
  priority: ["Low", "Medium", "High"] as const,
  status: ["Incomplete", "Complete"] as const,
};

export const validateAssignmentData = (obj: any) =>
  validateData<AssignmentData>(
    obj,
    AssignmentOptionMap,
    AssignmentTimestampArray,
    AssignmentStringArray
  );

export const validatePartialAssignmentData = (obj: any) =>
  validatePartialData<PartialAssignmentData>(
    obj,
    AssignmentOptionMap,
    AssignmentTimestampArray,
    AssignmentStringArray
  );

export const getPartialAssignmentData = (obj: any) =>
  getPartialObjectData<PartialAssignmentData>(
    obj,
    AssignmentOptionMap,
    AssignmentTimestampArray,
    AssignmentStringArray
  );

export type AssignmentData = StringAttributes<typeof AssignmentStringArray> &
  TimestampAttributes<typeof AssignmentTimestampArray> &
  OptionAttributes<typeof AssignmentOptionMap>;

export type PartialAssignmentData = {
  [n in keyof AssignmentData]?: AssignmentData[n];
};
