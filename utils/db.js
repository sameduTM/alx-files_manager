import pkg from 'mongodb';

const { MongoClient } = pkg;

class DBClient {
  constructor() {
    this.DB_HOST = process.env.DB_HOST || 'localhost';
    this.DB_PORT = process.env.DB_PORT || 27017;
    this.DB_DATABASE = process.env.DB_DATABASE || 'files_manager';

    this.isConnected = false;
  }

  async connectToMongo() {
    const uri = `mongodb://${this.DB_HOST}:${this.DB_PORT}`;
    this.client = new MongoClient(uri, {
      useUnifiedTopology: true,
    });
    try {
      await this.client.connect();
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  isAlive() {
    this.connectToMongo();
    return this.isConnected;
  }

  async nbUsers() {
    const db = this.client.db(this.DB_DATABASE);
    const collection = await db.collection('users');
    return collection.countDocuments();
  }

  async nbFiles() {
    const db = this.client.db(this.DB_DATABASE);
    const collection = await db.collection('files');
    return collection.countDocuments();
  }
}

const dbClient = new DBClient();

export default dbClient;
