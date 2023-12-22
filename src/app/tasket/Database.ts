import {
  Collection,
  Document,
  MongoClient,
  ObjectId,
  ServerApiVersion,
  UpdateFilter,
} from "mongodb";
import { collectionName, dbName, dbUri, jwtSecret } from "../../constants";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";
import { group } from "console";

export class DBCollection {
  private token = "";

  constructor(private collection: Collection) {}

  private verifyToken = (): DecodedToken => {
    if (!this.token) throw Error("No token provided.");

    const decoded = JWT.verify(this.token, jwtSecret);
    return decoded as DecodedToken;
  };

  private createToken = (userObjectId: string) => {
    const token = JWT.sign({ id: userObjectId }, jwtSecret, {
      algorithm: "HS256",
      expiresIn: "7d",
    });

    return token;
  };

  public extractToken = (req: Request): DBCollection => {
    this.token = req.headers.get("Authorization")?.split(" ")[1] ?? "";
    return this;
  };

  public createUser = async (email: string, password: string) => {
    const findResult = await this.collection.findOne({ email });
    if (findResult) throw Error("User with specified email already exists.");

    const encryptedPassword = await bcrypt.hash(password, 10);
    const userData = { email, password: encryptedPassword };

    const result = await this.collection.insertOne(userData);
    const id = result.insertedId.toString();

    const token = this.createToken(id);

    return token;
  };

  public login = async (email: string, password: string) => {
    const findResult = await this.collection.findOne({ email });
    if (!findResult) throw Error("User not found.");

    const userData = findResult as UserData;
    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (!passwordMatch) throw Error("Email and/or password is incorrect.");

    const id = userData._id.toString();
    const token = this.createToken(id);

    return token;
  };

  public getUser = async (): Promise<UserData> => {
    const verified = this.verifyToken();
    if (!verified) throw Error("Permission denied.");

    const { id } = verified;
    if (!id) throw Error("Token content not found.");

    const userData = await this.collection.findOne({ _id: new ObjectId(id) });
    if (!userData) throw Error("User not found.");

    return userData as UserData;
  };

  public createGroup = async (
    groupName: string,
    groupColor: string = "#0000FF"
  ) => {
    this.validateColor(groupColor);

    const userData = await this.getUser();
    if (userData.groups[groupName])
      throw Error("Group with this name already exists.");

    const newGroup: GroupData = {
      color: groupColor,
      type: "Class",
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
    if (groupAttributes.color) this.validateColor(groupAttributes.color);

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

  private validateColor = (color: string) => {
    if (!color.match(/#[0-9a-fA-F]{6}/) || color.length !== 7)
      throw Error("Provided color value is invalid.");
  };
}

export class DBClient {
  static connect = async (): Promise<MongoClient> => {
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

  static getCollection = async (): Promise<DBCollection> => {
    const client = await this.connect();
    const collection = client.db(dbName).collection(collectionName);

    return new DBCollection(collection);
  };
}

export type DecodedToken = {
  id: string;
  iat: number;
  exp: number;
};

export type UserData = {
  _id: ObjectId;
  email: string;
  password: string;
  settings: {};
  groups: {
    [name: string]: GroupData;
  };
};

export type GroupData = GroupAttributes & {
  events: EventData[];
  assignments: [];
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

export type EventData = {
  name: string;
  description: string;
  type: string;
  start: string;
  end: string;
};
