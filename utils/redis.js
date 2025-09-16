import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.isConnected = false;

    this.client.on('ready', () => {
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error(err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });
  
    this.client.on('end', () => {
      this.isConnected = false;
    });

    this.client.get = promisify(this.client.get).bind(this.client);
    this.client.set = promisify(this.client.setex).bind(this.client);
    this.client.del = promisify(this.client.del).bind(this.client);

  }

  isAlive() {
    return this.isConnected;
  }

  async get(key) {
    const value = await this.client.get(key);
    return value;
  }

  async set(key, value, duration) {
    await this.client.setex(key, duration, value);
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
