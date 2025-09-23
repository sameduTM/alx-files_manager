import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const baseAuth = request.get('Authorization');

    // Remove the basic prefix
    const encodedLogins = baseAuth.split('Basic ')[1];

    // Decode from base64
    const decodedLogins = Buffer.from(encodedLogins, 'base64').toString('utf8');

    // Split into email and password
    const colonIndex = decodedLogins.indexOf(':');
    const email = decodedLogins.substring(0, colonIndex);
    const password = decodedLogins.substring(colonIndex + 1);

    // checks if user exists
    const user = await dbClient.getUser(email);
    const hashedPassword = createHash('sha1').update(password).digest('hex');

    if (user) {
      if (user.password !== hashedPassword) {
        response.status(401).json({ error: 'Unauthorized' });
      }
      const token = uuidv4();
      const key = `auth_${token}`;

      // Storing in redis
      await redisClient.set(key, user._id, 24 * 3600);

      response.set('X-Token', token.toString());
      response.status(200).json({ token });
    } else {
      response.status(401).json({ error: 'Unauthorized' })
    }
  }

  static async getDisconnect(request, response) {
    const token = request.get('X-Token');
    const user = await redisClient.get(`auth_${token}`);

    if (!user) {
      response.status(401).json({ error: 'Unauthorized' });
    } else {
      await redisClient.del(`auth_${token}`);
      response.status(204).end();
    }
  }

  static async getMe(request, response) {
    const token = request.get('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      response.status(401).json({ error: 'Unauthorized' });
    } else {
      const users = await dbClient.getAllUsers();
      for (const user of users) {
        if (user._id.toString() === userId) {
          response.status(200).json({ id: userId, email: user.email });
        }
      }
    }
  }
}

export default AuthController;
