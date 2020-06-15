import redis from '../lib/redis';
import { redisCluster, redisPort, redisPrefix } from '../config/config';
// import { webSocketACLMiddleware } from '../lib/acl';
import socketio from 'socket.io';
import redisAdapter from 'socket.io-redis';
import logger from '../lib/logger';

export default (server) => {
  const io = socketio(server);
  io.adapter(redisAdapter({ host: redisCluster, port: redisPort }));

  // io.use(webSocketACLMiddleware);
  io.on('error', (e) => logger.error(e));
  io.on(`connection`, async (socket) => {
    // let pipeline = redis.pipeline();
    // pipeline
    //   .sadd(`${redisPrefix}:user:${socket.user.id}:sockets`, socket.id)
    //   .sadd(`${redisPrefix}:onlineUsers`, socket.user.id)
    //   .exec();

    // socket.on('disconnect', async () => {
    //   let pipeline = redis.pipeline();
    //   pipeline
    //     .srem(`${redisPrefix}:user:${socket.user.id}:sockets`, socket.id)
    //     .srem(`${redisPrefix}:onlineUsers`, socket.user.id)
    //     .exec();
    // });
  });

  return io;
};
