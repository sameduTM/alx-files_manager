import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(request, response) {
    const token = request.get('X-Token');
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId, isPublic, data,
    } = request.body;

    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return response.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }
    if (parentId) {
      const files = await dbClient.getAllFiles();
      for (const file of files) {
        if (file.parentId === parentId && type !== 'folder') {
          return response.status(400).json({ error: 'Parent is not a folder' });
        }
      }
      return response.status(400).json({ error: 'Parent not found' });
    }
    if (type === 'folder') {
      const obj = {
        userId,
        name,
        type,
        isPublic: false,
        parentId: parentId || 0,
      };
      const doc = await dbClient.createFile(obj);
      return response.status(201).json(doc.ops[0]);
    }

    const localPath = process.env.FILE_PATH || '/tmp/files_manager';
    const fileName = `${localPath}/${uuidv4()}`;
    const decodedData = Buffer.from(data, 'base64').toString('utf8');

    if (!existsSync(localPath)) {
      mkdirSync(localPath, { recursive: true });
    }

    writeFileSync(fileName, decodedData);
    const fileAttributes = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    };
    const fileDoc = await dbClient.createFile(fileAttributes);

    return response.status(201).json(fileDoc.ops[0]);
  }
}

export default FilesController;
