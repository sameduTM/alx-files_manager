import pkg from 'mongodb';

const { MongoClient, ObjectId } = pkg;

class DBClient {
  constructor() {
    this.DB_HOST = process.env.DB_HOST || 'localhost';
    this.DB_PORT = process.env.DB_PORT || 27017;
    this.DB_DATABASE = process.env.DB_DATABASE || 'files_manager';

    this.uri = `mongodb://${this.DB_HOST}:${this.DB_PORT}`;
    this.client = new MongoClient(this.uri, { useUnifiedTopology: true });
    this.isConnected = false;

    this.dbName = this.DB_DATABASE;

    (async () => {
      await this.client.connect();
      this.isConnected = true;
      this.db = this.client.db(this.dbName);
    })();
  }

  // Connect to the server
  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  async getAllUsers() {
    const users = this.db.collection('users').find({}).toArray();
    return users;
  }

  async getAllFiles() {
    const files = this.db.collection('files').find({}).toArray();
    return files;
  }

  async getFileById(parentId) {
    try {
      const file = this.db.collection('files').find({ _id: ObjectId(parentId) }).toArray();
      return file;
    } catch (err) {
      return null;
    }
  }

  async getUser(email) {
    const user = await this.db.collection('users').findOne({ email });
    return user;
  }

  async createUser(email, password) {
    const user = await this.db.collection('users').insertOne({ email, password });
    return user;
  }

  async createFile(obj) {
    const file = await this.db.collection('files').insertOne(obj);
    return file;
  }

  async getAllFilesById(parentId, page = 0, pageSize = 20) {
    // page is 0-based (page=0 => first page)
    const pageNum = Number(page);
    const pageIndex = Number.isNaN(pageNum) ? 0 : pageNum;
    const size = Math.min(Number(pageSize) || 20, 100);
    const skip = pageIndex * size;

    const pipeline = [
      { $match: { parentId: ObjectId(parentId) } },
      { $skip: skip },
      { $limit: size },
    ];

    const files = await this.db.collection('files').aggregate(pipeline).toArray();

    return files;
  }

  /**
   * Get files for a user with pagination
   * @param {string|ObjectId} userId
   * @param {number} page - 1-based page number
   * @param {number} pageSize - number of items per page
   */
  async getFilesByUserId(userId, page = 0, pageSize = 20) {
    // page is 0-based (page=0 => first page)
    const pageNum = Number(page);
    const pageIndex = Number.isNaN(pageNum) ? 0 : pageNum;
    const size = Math.min(Number(pageSize) || 20, 100); // cap pageSize to 100
    const skip = pageIndex * size;

    const pipeline = [
      { $match: { userId: ObjectId(userId) } },
      { $skip: skip },
      { $limit: size },
    ];

    const files = await this.db.collection('files').aggregate(pipeline).toArray();

    return files;
  }

  async updateFileByUserId(userId, isPublic) {
    const filter = { userId };
    const updateDocument = {
      $set: {
        isPublic,
      },
    };
    const result = await this.db.collection('files').updateOne(filter, updateDocument);
    return result;
  }
}

const dbClient = new DBClient();

export default dbClient;
