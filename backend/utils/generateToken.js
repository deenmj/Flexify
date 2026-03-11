// backend/utils/generateToken.js
import jwt from "jsonwebtoken";

export default function generateToken(id) {
  if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET is not defined in environment variables. Set it in your .env file.");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}
