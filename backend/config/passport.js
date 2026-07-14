import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import Staff from "../models/Staff.js";

// Check if critical client credentials are present
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("⚠️ Warning: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables. Google OAuth will be disabled.");
} else {
  const GOOGLE_CALLBACK = process.env.GOOGLE_CALLBACK_URL || "https://api.rentify.lk/api/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK,
        proxy: true,
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;

          // Check Staff collection first (mirrors login flow)
          let user = await Staff.findOne({ email });

          // Then check User collection
          if (!user) {
            user = await User.findOne({ email });
          }

          // Create new user if neither exists
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
              verified: true,
              emailVerifiedAt: new Date(),
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
}

export default passport;
