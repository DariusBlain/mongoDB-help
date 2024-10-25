import { TEMP_PATH, UPLOAD_PATH } from './constants/path.js';
import { initMongoConnection } from './db/initMongoConnection.js';
import { setupServer } from './server.js';
import { createDirIfNotExists } from './utils/createDirIfNotExists.js';

(async () => {
  await initMongoConnection();
  await createDirIfNotExists(TEMP_PATH);
  await createDirIfNotExists(UPLOAD_PATH);
  setupServer();
})();
