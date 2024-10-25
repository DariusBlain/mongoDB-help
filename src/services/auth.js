import { userModel } from '../db/models/user.js';
import createHttpError from 'http-errors';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { sessionModel } from '../db/models/session.js';
import {
  ACCESS_TOKEN_LIVE_TIME,
  REFRESH_TOKEN_LIVE_TIME,
} from '../constants/time.js';
import { emailClient } from '../utils/emailClient.js';
import { env } from '../utils/env.js';
import { ENV_VARS } from '../constants/index.js';
import { generateResetPasswordEmail } from '../utils/generateResetPasswordEmail.js';
import jwt from 'jsonwebtoken';

const createSession = () => ({
  accessToken: crypto.randomBytes(16).toString('base64'),
  refreshToken: crypto.randomBytes(16).toString('base64'),
  accessTokenValidUntil: new Date(Date.now() + ACCESS_TOKEN_LIVE_TIME),
  refreshTokenValidUntil: new Date(Date.now() + REFRESH_TOKEN_LIVE_TIME),
});

const findUserByEmail = async (email) => await userModel.findOne({ email });

export const registerUser = async (payload) => {
  let user = await findUserByEmail(payload.email);

  if (user) {
    throw createHttpError(409, 'Email in use');
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  user = await userModel.create({ ...payload, password: hashedPassword });

  return user;
};

export const loginUser = async (payload) => {
  const user = await findUserByEmail(payload.email);

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const arePasswordsEqual = await bcrypt.compare(
    payload.password,
    user.password,
  );

  if (!arePasswordsEqual) {
    throw createHttpError(401, 'User email or password incorrect');
  }

  await sessionModel.deleteOne({ userId: user._id });

  const session = await sessionModel.create({
    userId: user._id,
    ...createSession(),
  });

  return session;
};

export const logoutUser = async (sessionId, sessionToken) => {
  await sessionModel.deleteOne({
    _id: sessionId,
    refreshToken: sessionToken,
  });
};

export const refreshUser = async (sessionId, sessionToken) => {
  const session = await sessionModel.findOne({
    _id: sessionId,
    refreshToken: sessionToken,
  });

  if (!session) {
    throw createHttpError(401, 'Session not found');
  }

  const now = new Date();

  if (session.refreshTokenValidUntil < now) {
    throw createHttpError(401, 'Refresh token expired');
  }

  await sessionModel.deleteOne({
    _id: sessionId,
    refreshToken: sessionToken,
  });

  const newSession = await sessionModel.create({
    userId: session.userId,
    ...createSession(),
  });

  return newSession;
};

export const sendResetPasswordToken = async (email) => {
  const user = await userModel.findOne({ email });

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const resetToken = jwt.sign(
    {
      sub: user._id,
      email,
    },
    env(ENV_VARS.JWT_SECRET, {
      expiresIn: 60 * 15,
    }),
  );

  const resetLink = `${env(
    ENV_VARS.APP_DOMAIN,
  )}/auth/reset-password?token=${resetToken}`;

  try {
    await emailClient.sendMail({
      to: email,
      from: env(ENV_VARS.SMTP_FROM),
      html: generateResetPasswordEmail({
        name: user.name,
        resetLink: resetLink,
      }),
      subject: 'Reset your password',
    });
  } catch (error) {
    console.log(error);
    throw createHttpError(500, 'Error in sending email');
  }
};

export const resetPassword = async ({ token, password }) => {
  let payload;

  try {
    payload = jwt.verify(token, env(ENV_VARS.JWT_SECRET));
  } catch (error) {
    throw createHttpError(401, error.message);
  }

  const user = await userModel.findById(payload.sub);

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await userModel.findByIdAndUpdate(user._id, { password: hashedPassword });

  await sessionModel.deleteMany({ userId: user._id });
};
