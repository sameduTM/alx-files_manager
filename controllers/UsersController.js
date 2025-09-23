import { createHash } from 'crypto';
import dbClient from '../utils/db.js';

const waitConnection = () => new Promise((resolve, reject) => {
  let i = 0;

  const repeatFct = async () => {
    // Use Promise-based delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    i += 1;

    if (i >= 10) {
      reject(new Error('Connection timeout: Max retries (10) reached'));
    } else if (!dbClient.isAlive()) {
      repeatFct(); // Retry
    } else {
      resolve(); // Connection successful
    }
  };

  repeatFct();
});

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;
    if (!email) {
      return response.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return response.status(400).json({ error: 'Missing password' });
    }
    await waitConnection();
    const checkUser = await dbClient.getUser(email);
    if (checkUser) {
      return response.status(400).json({ error: 'Already exist' });
    }
    const hashPassword = createHash('sha1').update(password).digest('hex');
    const user = await dbClient.createUser(email, hashPassword);

    return response.status(201).json({ id: user.insertedId, email });
  }
}

export default UsersController;
