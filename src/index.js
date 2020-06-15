import { createServer } from 'http';
import cors from 'cors';
import express from 'express';
import logger from './lib/logger';

import routes from './routes';
import io from './io';

const app = express();

// Inject middle-wares.
app.use('/files', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

// create http & ws server.
const server = createServer(app);
const ws = io(server);

// inject io & namespaces as req object keys.
app.use((req, res, next) => {
  req.ws = ws;
  next();
});

routes(app);

if (process.env.NODE_ENV === 'production') server.listen(821 + process.env.NODE_APP_INSTANCE);
else if (process.env.NODE_ENV === 'test') server.listen(300 + process.env.NODE_APP_INSTANCE);
else server.listen(80, () => logger.info('Single core 🔨  development server started at 80'));
