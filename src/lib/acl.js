import UserModel from '../mongodb/models/user';
// import PermissionModel from '../mongodb/models/permission';
import { pathToRegexp } from 'path-to-regexp';
import { sign, verify } from 'jsonwebtoken';
import { __ } from 'i18n';
import {
  JWTAccessSecret,
  JWTRefreshSecret,
  JWTAccessSecretExpiresIn,
  JWTRefreshSecretExpiresIn,
} from '../config/config.json';
import logger from './logger';

// create access & refresh token.
export const createTokens = (user) => {
  let refreshToken = sign(
    {
      id: user.id,
      count: user.refreshTokenCount,
    },
    JWTRefreshSecret,
    {
      expiresIn: JWTRefreshSecretExpiresIn,
    }
  );

  let accessToken = sign(
    {
      id: user.id,
    },
    JWTAccessSecret,
    {
      expiresIn: JWTAccessSecretExpiresIn,
    }
  );

  let cookieOptions = { httpOnly: true, secure: true, domain: 'localhost', sameSite: false };

  return { accessToken, refreshToken, cookieOptions };
};

// middle ware for http
export const ACLMiddleware = async (req, res, next) => {
  let accessToken = req.headers.accesstoken;
  let refreshToken = req.headers.refreshtoken;

  if (!accessToken && !refreshToken) {
    accessToken = req.cookies.accessToken;
    refreshToken = req.cookies.refreshToken;
    if (!accessToken && !refreshToken) return res.status(401).json({ messages: [__(`Tokens are not provided.`)] });
  }

  let messages = [];
  try {
    let data = verify(accessToken, JWTAccessSecret);
    req.user = data;
    return next();
  } catch (e) {
    messages.push(__(`Invalid access token.`));
  }

  let data;
  try {
    data = verify(refreshToken, JWTRefreshSecret);
    req.user = data;
  } catch (e) {
    logger.warn(e);
    messages.push(__(`Invalid refresh token.`));
    return res.status(401).json({ messages });
  }

  let user = await UserModel.findById(req.user.id);
  // token has been invalidated.

  if (!user || user.refreshTokenCount !== data.count) {
    messages.push(__(`This refresh token has been invalidated.`));
    return res.status(401).json({ messages });
  }

  user = {
    id: user.id,
    refreshTokenCount: user.refreshTokenCount,
  };

  let tokens = createTokens(user);
  res.cookie('refreshToken', tokens.refreshToken, process.env.NODE_ENV === 'production' ? tokens.tokenOptions : {});
  res.cookie('accessToken', tokens.accessToken, process.env.NODE_ENV === 'production' ? tokens.tokenOptions : {});
  req.user = user;

  return next();
};

/*export const isAllowed = async ({ role, path, methods }) => {
  let permissions = await PermissionModel.find({
    //role,
    methods
  });
  if (!permissions) return false;
  return permissions.map(p => p.toJSON()).some(p => pathToRegexp(p.path).test(path)) ? true : false;
};*/

export const webSocketACLMiddleware = async (socket, next) => {
  if (!socket.handshake.query) {
    return next(new Error(JSON.stringify({ status: 401, messages: [__('Authentication not determined.')] })));
  }

  let messages = [];
  let { refreshToken, accessToken } = socket.handshake.query;

  if (!accessToken && !refreshToken)
    return next(new Error(JSON.stringify({ status: 401, messages: [__('Tokens are not determined.')] })));
  try {
    let data = verify(accessToken, JWTAccessSecret);
    socket.user = data;
    return next();
  } catch (e) {
    // logger.error(e);
    messages.push(__(`Invalid access token.`));
  }

  let data;
  try {
    data = verify(refreshToken, JWTRefreshSecret);
    socket.user = data;
  } catch (e) {
    // logger.error(e);
    messages.push(__(`Invalid refresh token.`));
    return next(new Error(JSON.stringify({ status: 401, messages })));
  }

  let user = await UserModel.findById(socket.user.id);
  // token has been invalidated.
  if (!user || user.refreshTokenCount !== data.count) {
    messages.push(__(`This refresh token has been invalidated.`));
    return next(new Error(JSON.stringify({ status: 401, messages })));
  }

  user = {
    id: user.id,
    refreshTokenCount: user.refreshTokenCount,
  };

  let tokens = createTokens(user);
  socket.user = user;
  socket.emit(`newTokens`, tokens);

  return next();
};
