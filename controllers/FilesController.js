import pkg from 'mongodb';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = pkg;

class FilesController {
  static async postUpload(request, response) {
    const tokenId = request.get('X-Token');
    const userId = await redisClient.get(`auth_${tokenId}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, data,
    } = request.body;

    const isPublic = request.body.isPublic || false;

    let parentId = request.body.parentId || 0;

    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return response.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }
    if (parentId) {
      const file = await dbClient.getFileById(parentId);

      if (!file[0]) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (file[0] && file[0].type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
      parentId = ObjectId(parentId);
    }
    if (type === 'folder') {
      const newFolder = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
      };
      const addedFolder = await dbClient.createFile(newFolder);

      return response.status(201).json({
        id: addedFolder.insertedId,
        userId,
        name,
        type,
        isPublic: addedFolder.ops[0].isPublic,
        parentId: addedFolder.ops[0].parentId,
      });
    }

    const relativePath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const localPath = `${relativePath}/${uuidv4()}`;
    const decodedData = Buffer.from(data, 'base64');

    if (!existsSync(relativePath)) {
      mkdirSync(relativePath, { recursive: true });
    }

    writeFileSync(localPath, decodedData);

    const newFileDocument = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || 0,
      localPath,
    };

    const addedFile = await dbClient.createFile(newFileDocument);

    return response.status(201).json({
      id: addedFile.insertedId,
      userId,
      name,
      type,
      isPublic: addedFile.ops[0].isPublic,
      parentId: addedFile.ops[0].parentId,
    });
  }

  static async getShow(request, response) {
    const token = request.get('X-token');
    const fileId = request.params.id;
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const files = await dbClient.getFileById(fileId);
    const userFiles = await dbClient.getFilesByUserId(userId);

    if (!files[0] || userFiles.length === 0) {
      return response.status(404).json({ error: 'Not found' });
    }

    const fileOutput = {};

    files.forEach((file) => {
      fileOutput.id = file._id;
      fileOutput.userId = file.userId;
      fileOutput.name = file.name;
      fileOutput.type = file.type;
      fileOutput.isPublic = file.isPublic;
      fileOutput.parentId = file.parentId;
    });

    return response.status(200).json(fileOutput);
  }

  static async getIndex(request, response) {
    const token = request.get('X-token');
    // const fileId = request.params.id;
    const userId = await redisClient.get(`auth_${token}`);
    // parentId comes as string; use '0' to indicate root
    const parentId = request.query.parentId || '0';
    // page is expected as 0-based in DB client; if client passes 1 it means second page
    const page = Number.isNaN(Number(request.query.page)) ? 0 : Number(request.query.page);
    const pageSize = Number.isNaN(Number(request.query.pageSize))
      ? 20
      : Number(request.query.pageSize);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    // Decide which query to run: by parentId or by user
    let files = [];
    if (parentId && parentId !== '0') {
      files = await dbClient.getAllFilesById(parentId, page, pageSize);
    } else {
      files = await dbClient.getFilesByUserId(userId, page, pageSize);
    }

    const fileOutput = files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));

    return response.status(200).json(fileOutput);
  }

  static async putPublish(request, response) {
    const userToken = request.get('X-Token');
    const fileId = request.params.id;
    const userId = redisClient.get(`auth_${userToken}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    let userFile = await dbClient.getFileByFileId(fileId);

    if (userFile.length === 0) {
      return response.status(404).json({ error: 'Not found' });
    }

    await dbClient.updateFileByUserId(fileId, true);

    userFile = await dbClient.getFileByFileId(fileId);

    return response.status(200).json({
      id: userFile[0]._id,
      name: userFile[0].name,
      type: userFile[0].type,
      isPublic: userFile[0].isPublic,
      parentId: userFile[0].parentId,
    });
  }

  static async putUnpublish(request, response) {
    const userToken = request.get('X-Token');
    const fileId = request.params.id;
    const userId = redisClient.get(`auth_${userToken}`);

    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    let userFile = await dbClient.getFileByFileId(fileId);

    if (userFile.length === 0) {
      return response.status(404).json({ error: 'Not found' });
    }

    await dbClient.updateFileByUserId(fileId, false);

    userFile = await dbClient.getFileByFileId(fileId);

    return response.status(200).json({
      id: userFile[0]._id,
      name: userFile[0].name,
      type: userFile[0].type,
      isPublic: userFile[0].isPublic,
      parentId: userFile[0].parentId,
    });
  }
}

export default FilesController;
