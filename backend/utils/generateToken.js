// backend/utils/generateToken.js
import jwt from "jsonwebtoken";

export default function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || "changeme", {
    expiresIn: "7d",
  });
}
