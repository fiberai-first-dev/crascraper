import { query } from "../config/database.js";

export const userRepository = {
  async findByEmail(email) {
    const { rows } = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await query("SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1", [id]);
    return rows[0] || null;
  },

  async create({ email, passwordHash, name }) {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at, updated_at`,
      [email.toLowerCase(), passwordHash, name]
    );
    return rows[0];
  },

  async count() {
    const { rows } = await query("SELECT COUNT(*)::int AS count FROM users");
    return rows[0].count;
  },
};
