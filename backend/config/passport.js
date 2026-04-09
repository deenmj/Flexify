import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

// Ensure required environment variables are present
const requiredEnv = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"];
requiredEnv.forEach((param) => {
  if (!process.env[param]) {
    throw new Error(`Missing required environment variable: ${param}`);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g. https://yourdomain.com/api/auth/google/callback
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // Find or create user
        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            password: "google-oauth", // Placeholder for oauth users
            role: "user",
            isKycVerified: false,
            verificationStatus: "not_submitted",
            status: "active",
            profilePic: profile.photos?.[0]?.value || null,
            provider: "google",
          });
        }

        return done(null, user);
      } catch (err) {
        console.error("Google auth strategy error:", err);
        return done(err, null);
      }
    }
  )
);

export default passport;
