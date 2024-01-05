import {
  Collection,
  Document,
  MongoClient,
  ObjectId,
  ServerApiVersion,
  Timestamp,
  UpdateFilter,
} from "mongodb";
import {
  collectionName,
  dbName,
  dbUri,
  jwtSecret,
  tokenCookieName,
} from "../../constants";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import {
  AssignmentData,
  PartialAssignmentData,
} from "./user/group/[group]/assignment/assignmentTypes";
import { parseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export class DBCollection {
  constructor(public collection: Collection) {}

  private static createTokenCookie = (userObjectId: string) => {
    const token = JWT.sign({ id: userObjectId }, jwtSecret, {
      algorithm: "HS256",
      expiresIn: "7d",
    });

    const tokenCookie = `${tokenCookieName}=${token}; SameSite=None; Secure; HttpOnly; Path=/tasket`;

    return tokenCookie;
  };

  public createUser = async (
    email: string,
    password: string
  ): Promise<string> => {
    const findResult = await this.collection.findOne({ email });
    if (findResult) throw Error("User with specified email already exists.");

    const encryptedPassword = await bcrypt.hash(password, 10);
    const userData = { email, password: encryptedPassword };

    const result = await this.collection.insertOne(userData);
    const id = result.insertedId.toString();

    const tokenCookie = DBCollection.createTokenCookie(id);

    return tokenCookie;
  };

  public login = async (email: string, password: string): Promise<string> => {
    const findResult = await this.collection.findOne({ email });
    if (!findResult) throw Error("User not found.");

    const userData = findResult as UserData;
    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (!passwordMatch) throw Error("Email and/or password is incorrect.");

    const id = userData._id.toString();
    const tokenCookie = DBCollection.createTokenCookie(id);

    return tokenCookie;
  };

  public static validateColor = (color: string) => {
    if (!color.match(/#[0-9a-fA-F]{6}/) || color.length !== 7)
      throw Error("Provided color value is invalid.");
  };

  public static msStringToTimestamp = (milliseconds: string): Timestamp => {
    return new Timestamp(BigInt(new Date(parseInt(milliseconds)).getTime()));
  };
}

export class ProtectedDBCollection extends DBCollection {
  constructor(collection: Collection, private decodedToken: DecodedToken) {
    super(collection);
  }

  public getUser = async (): Promise<SafeUserData> => {
    const { id } = this.decodedToken;
    if (!id) throw Error("Token content not found.");

    const userData = await this.collection.findOne({ _id: new ObjectId(id) });
    if (!userData) throw Error("User not found.");

    delete userData.password;
    return userData as SafeUserData;
  };

  public createGroup = async (
    groupName: string,
    groupColor: string = "#0000FF",
    groupType: string = "Class"
  ) => {
    DBCollection.validateColor(groupColor);

    const userData = await this.getUser();
    if (userData.groups[groupName])
      throw Error("Group with this name already exists.");

    const newGroup: GroupData = {
      color: groupColor,
      type: groupType,
      events: [],
      assignments: [],
    };

    const fieldId = `groups.${groupName}`;

    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      {
        $set: {
          [fieldId]: newGroup,
        },
      }
    );
    if (updateResult.modifiedCount !== 1) throw Error("Group creation failed.");

    return updateResult;
  };

  public updateGroup = async (
    groupName: string,
    groupAttributes: OptionalGroupAttributes,
    newGroupName?: string
  ) => {
    if (groupAttributes.color)
      DBCollection.validateColor(groupAttributes.color);

    const userData = await this.getUser();

    const oldGroup = userData.groups[groupName];
    if (!oldGroup) throw Error("Group not found.");

    if (groupName === newGroupName) newGroupName = undefined;

    const newGroup = newGroupName && userData.groups[newGroupName];
    if (newGroup) throw Error("Group with this name already exists.");

    const updateEntries = Object.entries(groupAttributes).filter((entry) =>
      GroupAttributeArray.find((att) => att === entry[0])
    );

    if (updateEntries.length === 0)
      throw Error("No update attributes specified.");

    const updateFilter = updateEntries.map((entry) => {
      const fieldId = `groups.${groupName}.${entry[0]}`;
      const filter: UpdateFilter<Document> = {
        $set: {
          [fieldId]: entry[1],
        },
      };

      return filter;
    });

    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      updateFilter
    );
    if (updateResult.matchedCount !== 1) throw Error("Group update failed.");

    if (!newGroupName) return updateResult;

    const oldFieldId = `groups.${groupName}`;
    const newFieldId = `groups.${newGroupName}`;

    const newUpdateResult = await this.collection.updateOne(
      {
        _id: userData._id,
      },
      {
        $rename: {
          [oldFieldId]: newFieldId,
        },
      }
    );
    if (newUpdateResult.matchedCount !== 1) throw Error("Group update failed.");

    return newUpdateResult;
  };

  public deleteGroup = async (groupName: string) => {
    const userData = await this.getUser();

    const group = userData.groups[groupName];
    if (!group) throw Error("Group not found.");

    const fieldId = `groups.${groupName}`;
    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      {
        $unset: { [fieldId]: "" },
      }
    );
    if (updateResult.modifiedCount !== 1) throw Error("Group deletion failed.");

    return updateResult;
  };

  public createEvent = async (groupName: string, eventData: RawEventData) => {
    const userData = await this.getUser();
    const newEvent: EventData = {
      name: eventData.name,
      description: eventData.description,
      start_date: DBCollection.msStringToTimestamp(eventData.start_date),
      end_date: DBCollection.msStringToTimestamp(eventData.end_date),
    };

    if (eventData.schedule) {
      newEvent.schedule = {
        recurs: eventData.schedule.recurs,
        recurs_until: DBCollection.msStringToTimestamp(
          eventData.schedule.recurs_until
        ),
      };
    }

    const fieldId = `groups.${groupName}.events`;

    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      {
        $push: {
          [fieldId]: newEvent,
        },
      }
    );
    if (updateResult.modifiedCount !== 1) throw Error("Event creation failed.");

    return updateResult;
  };

  public updateEvent = async (
    groupName: string,
    eventIndex: number,
    eventData: OptionalRawEventData
  ) => {
    const userData = await this.getUser();

    const event = userData.groups[groupName].events[eventIndex];
    if (!event) throw Error("Event not found.");

    const eventUpdates: OptionalEventData = {
      name: eventData.name,
      description: eventData.description,
      start_date:
        (eventData.start_date &&
          DBCollection.msStringToTimestamp(eventData.start_date)) ||
        undefined,
      end_date:
        (eventData.end_date &&
          DBCollection.msStringToTimestamp(eventData.end_date)) ||
        undefined,
    };

    if (eventData.schedule && !eventData.schedule.recurs)
      throw Error("Schedule recur value not provided.");
    if (
      eventData.schedule &&
      !EventRecurrenceArray.find(
        (r) => r === (eventData.schedule as RawEventScheduleData).recurs
      )
    )
      throw Error("Schedule recur value invalid.");
    if (eventData.schedule && !eventData.schedule.recurs_until)
      throw Error("Schedule recurs until value not provided.");

    if (eventData.schedule) {
      eventUpdates.schedule = {
        recurs: eventData.schedule.recurs,
        recurs_until: DBCollection.msStringToTimestamp(
          eventData.schedule.recurs_until
        ),
      };
    }

    const updateArray = Object.entries(eventUpdates).filter(
      (entry) => entry[1]
    );

    const events = userData.groups[groupName].events;

    updateArray.forEach((entry) => {
      events[eventIndex][entry[0] as keyof EventData] = entry[1] as any;
    });

    if (updateArray.length === 0)
      throw Error("No update attributes specified.");

    const fieldId = `groups.${groupName}.events`;

    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      {
        $set: {
          [fieldId]: events,
        },
      }
    );
    if (updateResult.matchedCount !== 1) throw Error("Event update failed.");

    return updateResult;
  };

  public deleteEvent = async (groupName: string, eventIndex: number) => {
    const userData = await this.getUser();

    const event = userData.groups[groupName].events[eventIndex];
    if (!event) throw Error("Event not found.");

    const fieldId = `groups.${groupName}.events`;
    const eventFieldId = `${fieldId}.${eventIndex}`;
    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      {
        $set: {
          [eventFieldId]: "null",
        },
      }
    );
    if (updateResult.modifiedCount !== 1) throw Error("Event deletion failed.");

    await this.collection.updateOne(
      { _id: userData._id },
      {
        $pull: {
          [fieldId]: "null",
        },
      }
    );

    return updateResult;
  };

  public createAssignment = async (
    groupName: string,
    assignmentData: AssignmentData
  ) => {
    const userData = await this.getUser();
    const fieldId = `groups.${groupName}.assignments`;

    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      {
        $push: {
          [fieldId]: assignmentData,
        },
      }
    );
    if (updateResult.modifiedCount !== 1)
      throw Error("Assignment creation failed.");

    return updateResult;
  };

  public updateAssignment = async (
    groupName: string,
    assignmentIndex: number,
    partialAssignmentData: PartialAssignmentData
  ) => {
    const userData = await this.getUser();

    const assignment = userData.groups[groupName].assignments[assignmentIndex];
    if (!assignment) throw Error("Assignment not found.");

    const updateArray = Object.entries(partialAssignmentData).filter(
      (entry) => entry[1] !== undefined
    );

    const assignments = userData.groups[groupName].assignments;

    updateArray.forEach((entry) => {
      assignments[assignmentIndex][entry[0] as keyof AssignmentData] =
        entry[1] as any;
    });

    const fieldId = `groups.${groupName}.assignments`;

    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      {
        $set: {
          [fieldId]: assignments,
        },
      }
    );
    if (updateResult.matchedCount !== 1)
      throw Error("Assignment update failed.");

    return updateResult;
  };

  public deleteAssignment = async (
    groupName: string,
    assignmentIndex: number
  ) => {
    const userData = await this.getUser();

    const assignment = userData.groups[groupName].assignments[assignmentIndex];
    if (!assignment) throw Error("Assignment not found.");

    const fieldId = `groups.${groupName}.assignments`;
    const assignmentFieldId = `${fieldId}.${assignmentIndex}`;

    const updateResult = await this.collection.updateOne(
      { _id: userData._id },
      {
        $set: {
          [assignmentFieldId]: "null",
        },
      }
    );
    if (updateResult.modifiedCount !== 1)
      throw Error("Assignment deletion failed.");

    await this.collection.updateOne(
      { _id: userData._id },
      {
        $pull: {
          [fieldId]: "null",
        },
      }
    );

    return updateResult;
  };
}

export class DBClient {
  private static getCollection = async (): Promise<Collection> => {
    const client = await this.connect();
    const collection = client.db(dbName).collection(collectionName);

    return collection;
  };

  private static connect = async (): Promise<MongoClient> => {
    try {
      const client = new MongoClient(dbUri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });

      await client.connect();

      return client;
    } catch (e) {
      throw Error("The collection could not be connected to.");
    }
  };

  private static extractToken = (req: Request): string => {
    const cookieString = req.headers.get("Cookie");
    if (!cookieString) throw Error("No token provided.");

    const token = parseCookie(cookieString).get(tokenCookieName);
    if (!token) throw Error("No token provided.");

    return token;
  };

  private static verifyToken = (encodedToken: string): DecodedToken => {
    const decodedToken = JWT.verify(encodedToken, jwtSecret);
    if (!decodedToken) throw Error("Permission denied.");

    return decodedToken as DecodedToken;
  };

  public static getDBCollection = async (): Promise<DBCollection> => {
    const collection = await this.getCollection();
    return new DBCollection(collection);
  };

  public static getProtectedDBCollection = async (
    req: Request
  ): Promise<ProtectedDBCollection> => {
    const token = this.extractToken(req);
    const decodedToken = this.verifyToken(token);

    const collection = await this.getCollection();
    return new ProtectedDBCollection(collection, decodedToken);
  };
}

export type DecodedToken = {
  id: string;
  iat: number;
  exp: number;
};

export type UserData = SafeUserData & {
  password: string;
};

export type SafeUserData = {
  _id: ObjectId;
  email: string;
  settings: {};
  groups: {
    [name: string]: GroupData;
  };
};

export type GroupData = GroupAttributes & {
  events: EventData[];
  assignments: AssignmentData[];
};

export const GroupAttributeArray = ["color", "type"] as const;

export type GroupAttributes = {
  [n in (typeof GroupAttributeArray)[number]]: string;
};

export type OptionalGroupAttributes = {
  [n in keyof GroupAttributes]?: GroupAttributes[n];
};

export type NamedGroupData = {
  name: string;
} & GroupData;

export const EventRecurrenceArray = [
  "Daily",
  "Weekly",
  "Monthly-Date",
  "Monthly-Weekday",
  "Yearly",
] as const;

export const EventAttributeArray = [
  "name",
  "description",
  "start_date",
  "end_date",
  "schedule",
] as const;

export type RawEventData = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  schedule?: RawEventScheduleData;
};

export type OptionalRawEventData = {
  [n in keyof RawEventData]?: RawEventData[n];
};

export type RawEventScheduleData = {
  recurs: (typeof EventRecurrenceArray)[number];
  recurs_until: string;
};

export type EventData = {
  name: string;
  description: string;
  start_date: Timestamp;
  end_date: Timestamp;
  schedule?: EventScheduleData;
};

export type OptionalEventData = {
  [n in keyof EventData]?: EventData[n];
};

export type EventScheduleData = {
  recurs: (typeof EventRecurrenceArray)[number];
  recurs_until: Timestamp;
};
