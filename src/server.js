import express from 'express';
import pino from 'pino-http';
import cors from 'cors';
import { env } from './utils/env.js';
import { ENV_VARS } from './constants/index.js';
import { notFoundMiddleware } from './middlewares/notFound.js';
import { errorHandlerMiddleware } from './middlewares/errorHandler.js';
import router from './routers/index.js';
import cookieParser from 'cookie-parser';
import { UPLOAD_PATH } from './constants/path.js';

const PORT = env(ENV_VARS.PORT, 3000);

export const setupServer = () => {
  const app = express();

  app.use(
    pino({
      transport: {
        target: 'pino-pretty',
      },
    }),
  );

  app.use(cors());

  app.use(cookieParser());

  app.use(
    express.json({
      type: ['application/json', 'application/vnd.api+json'],
    }),
  );

  app.use('/upload', express.static(UPLOAD_PATH));

  app.get('/', async (req, res) => {
    res.status(200).json({
      message: 'Hello world!',
    });
  });

  app.use(router);

  app.use(notFoundMiddleware);

  app.use(errorHandlerMiddleware);

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
