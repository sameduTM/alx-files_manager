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
}

const dbClient = new DBClient();

export default dbClient;
