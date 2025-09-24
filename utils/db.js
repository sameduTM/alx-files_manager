import pkg from 'mongodb';

const { MongoClient } = pkg;

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

  async getUser(email) {
    const user = await this.db.collection('users').findOne({ email })
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
}

const dbClient = new DBClient();

export default dbClient;
