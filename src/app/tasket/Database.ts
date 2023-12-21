import { Collection, MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { collectionName, dbName, dbUri, jwtSecret } from "../../constants";
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";

export class DBCollection {
  private token = "";

  constructor(private collection: Collection) {}

  private verifyToken = (): DecodedToken | undefined => {
    try {
      const decoded = JWT.verify(this.token, jwtSecret);
      return decoded as DecodedToken;
    } catch (e) {}

    return;
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

  public getData = async (): Promise<Object> => {
    const verified = this.verifyToken();
    if (!verified) throw Error("Permission denied.");

    const data = this.collection.find();

    return data.toArray();
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
};
