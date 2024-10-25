import { UPLOAD_PATH } from '../constants/path.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from './env.js';
import { ENV_VARS } from '../constants/index.js';

export const saveImageLocally = async (file) => {
  const { path: oldPath, filename } = file;
  const newPath = path.join(UPLOAD_PATH, filename);

  await fs.rename(oldPath, newPath);

  return `${env(ENV_VARS.BACKEND_DOMAIN)}/upload/${filename}`;
};
