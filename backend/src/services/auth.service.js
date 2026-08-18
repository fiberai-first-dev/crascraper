import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { HttpError } from "../utils/errors.js";
import { userRepository } from "../repositories/user.repository.js";

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export const authService = {
  signToken(user) {
    return jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
  },

  verifyToken(token) {
    return jwt.verify(token, env.jwtSecret);
  },

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new HttpError(401, "Invalid email or password");
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new HttpError(401, "Invalid email or password");
    return {
      token: this.signToken(user),
      user: publicUser(user),
    };
  },

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new HttpError(401, "Unauthorized");
    return publicUser(user);
  },
};
