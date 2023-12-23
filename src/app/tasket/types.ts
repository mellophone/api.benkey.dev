import { Timestamp } from "mongodb";

export const validateData = <T>(
  obj: RandomObject,
  OptionMap: OptionMap,
  TimestampArray: ExplicitStringArray,
  StringArray: ExplicitStringArray
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
  obj: RandomObject,
  OptionMap: OptionMap,
  TimestampArray: ExplicitStringArray,
  StringArray: ExplicitStringArray
): T => {
  for (const key in OptionMap) {
    if (
      obj[key] !== undefined &&
      !OptionMap[key].find((o: string) => o === obj[key])
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
  obj: RandomObject,
  OptionMap: OptionMap,
  TimestampArray: ExplicitStringArray,
  StringArray: ExplicitStringArray
): T => {
  const pasd: any = {};

  const typeTFields = [...Object.keys(OptionMap), ...StringArray];

  typeTFields.forEach((field) => {
    if (obj[field] !== undefined) {
      pasd[field] = obj[field];
    }
  });

  TimestampArray.forEach((field: string) => {
    if (obj[field] !== undefined) {
      pasd[field] = msStringToTimestamp(obj[field]);
    }
  });

  if (Object.entries(pasd).length === 0)
    throw Error("No attributes specified.");

  return pasd as T;
};

export const msStringToTimestamp = (milliseconds: string): Timestamp => {
  return new Timestamp(BigInt(new Date(parseInt(milliseconds)).getTime()));
};

export type StringAttributes<ArrayT extends ExplicitStringArray> = {
  [stringField in ArrayT[number]]: string;
};

export type TimestampAttributes<ArrayT extends ExplicitStringArray> = {
  [timestampField in ArrayT[number]]: Timestamp;
};

export type RandomObject = {
  [n: string]: any;
};

export type OptionMap = {
  [n: string]: ExplicitStringArray;
};

export type ExplicitStringArray = readonly string[];

export type OptionAttributes<ObjectMapT extends OptionMap> = {
  [optionField in keyof ObjectMapT]: ObjectMapT[optionField];
};
