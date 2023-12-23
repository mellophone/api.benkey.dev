import { Timestamp } from "mongodb";

export const validateData = <T>(
  obj: any,
  OptionMap: any,
  TimestampArray: any,
  StringArray: any
): T => {
  for (const key of [
    ...Object.keys(OptionMap),
    ...TimestampArray,
    ...StringArray,
  ]) {
    if (obj[key] === undefined) throw Error(`No ${key} value provided.`);
  }

  return validatePartialData(obj, OptionMap, TimestampArray, StringArray);
};

export const validatePartialData = <T>(
  obj: any,
  OptionMap: any,
  TimestampArray: any,
  StringArray: any
): T => {
  for (const key in OptionMap) {
    if (
      obj[key] !== undefined &&
      !OptionMap[key as keyof typeof OptionMap].find((o: any) => o === obj[key])
    ) {
      throw Error(`Provided ${key} value is invalid.`);
    }
  }

  for (const key of TimestampArray) {
    if (obj[key] && Number.isNaN(parseInt(obj[key]))) {
      throw Error(`Provided ${key} value is invalid.`);
    }
  }

  return getPartialObjectData<T>(obj, OptionMap, TimestampArray, StringArray);
};

export const getPartialObjectData = <T>(
  obj: any,
  OptionMap: any,
  TimestampArray: any,
  StringArray: any
): T => {
  const pasd: any = {};

  const typeTFields = [...Object.keys(OptionMap), ...StringArray];

  typeTFields.forEach((field) => {
    if (obj[field] !== undefined) {
      pasd[field as keyof T] = obj[field];
    }
  });

  TimestampArray.forEach((field: string) => {
    if (obj[field] !== undefined) {
      pasd[field as keyof T] = msStringToTimestamp(obj[field]);
    }
  });

  if (Object.entries(pasd).length === 0)
    throw Error("No attributes specified.");

  return pasd as T;
};

export const msStringToTimestamp = (milliseconds: string): Timestamp => {
  return new Timestamp(BigInt(new Date(parseInt(milliseconds)).getTime()));
};

export type StringAttributes<ArrayT extends readonly string[]> = {
  [stringField in ArrayT[number]]: string;
};

export type TimestampAttributes<ArrayT extends readonly string[]> = {
  [timestampField in ArrayT[number]]: Timestamp;
};

export type OptionMap = {
  [n: string]: readonly string[];
};

export type OptionAttributes<ObjectMapT extends OptionMap> = {
  [optionField in keyof ObjectMapT]: ObjectMapT[optionField];
};
