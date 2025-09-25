import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { ObjectId } from 'mongodb';
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
      name, type, parentId, data,
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
      const file = await dbClient.getFileById(parentId);

      if (!file || file.length === 0) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (file[0].type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      const obj = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic: false,
        parentId: 0,
      };
      const doc = await dbClient.createFile(obj);
      const newFileAttr = {
        id: doc.ops[0]._id,
        userId,
        name,
        type,
        isPublic: doc.ops[0].isPublic,
        parentId: doc.ops[0].parentId,
      };

      return response.status(201).json(newFileAttr);
    }

    const filePath = process.env.FILE_PATH || '/tmp/files_manager';
    const localPath = `${filePath}/${uuidv4()}`;
    const decodedData = Buffer.from(data, 'base64');

    if (!existsSync(localPath)) {
      mkdirSync(filePath, { recursive: true });
    }

    writeFileSync(localPath, decodedData);

    const fileAttributes = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic: request.body.isPublic || false,
      parentId: request.body.parentId || 0,
      localPath,
    };
    const fileDoc = await dbClient.createFile(fileAttributes);

    const newFileAttr = {
      id: fileDoc.ops[0]._id,
      userId,
      name,
      type,
      isPublic: fileDoc.ops[0].isPublic,
      parentId: fileDoc.ops[0].parentId,
    };

    return response.status(201).json(newFileAttr);
  }
}

export default FilesController;
