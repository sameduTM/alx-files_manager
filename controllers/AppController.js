import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class AppController {
  static async getStatus(request, response) {
    const redisStatus = await redisClient.isAlive();
    const dbStatus = await dbClient.isAlive();
    if (redisClient && dbStatus) {
      response.status(200).json({
        redis: true,
        db: true,
      });
    } else {
      response.status(500).json({
        redis: redisStatus,
        db: dbStatus,
      });
    }
  }

  static async getStats(request, response) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    response.status(200).json({ users, files });
  }
}

export default AppController;
