import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

// Ensure critical client credentials are present
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables.");
}

const GOOGLE_CALLBACK = process.env.GOOGLE_CALLBACK_URL || "https://flexify-production.up.railway.app/api/auth/google/callback";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK,
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
            password: "google-oauth",
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
