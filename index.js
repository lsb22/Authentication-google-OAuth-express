const fs = require("fs");
const https = require("https");
const helmet = require("helmet");
const express = require("express");
const passport = require("passport");
const cookieSession = require("cookie-session");
const { Strategy } = require("passport-google-oauth20");
const { callbackify } = require("util");
require("dotenv").config();

const app = express();

const config = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  SESSION_KEY_1: process.env.SESSION_KEY_1,
  SESSION_KEY_2: process.env.SESSION_KEY_2,
};

const AUTH_OPTIONS = {
  callbackURL: "/auth/google/callback",
  clientID: config.CLIENT_ID,
  clientSecret: config.CLIENT_SECRET,
};

function verifyCallback(accessToken, refreshToken, profile, done) {
  console.log("Google profile", profile);
  done(null, profile);
}

passport.use(new Strategy(AUTH_OPTIONS, verifyCallback));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  done(null, id);
});

app.use(helmet());
app.use(
  cookieSession({
    name: "myCookieHsd",
    maxAge: 24 * 60 * 60 * 1000, // 24hr
    keys: [config.SESSION_KEY_1, config.SESSION_KEY_2],
  })
);
app.use((req, res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb) => {
      cb();
    };
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb) => {
      cb();
    };
  }
  next();
});
app.use(passport.initialize());
app.use(passport.session());

function checkLoggedIn(req, res, next) {
  const isLoggedIn = req.isAuthenticated() && req.user;
  if (!isLoggedIn) {
    return res.status(401).json({ error: "You must log in" });
  }
  next();
}

app.get("/secret", checkLoggedIn, (req, res) => {
  res.send("<h1>Hello LSB!!!, you're favourite team is RCB!!!.</h1>");
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/failure",
    successRedirect: "/",
    session: true,
  }),
  (req, res) => {
    console.log("Google called us back!!!");
  }
);

app.get("/failure", (req, res) => {
  return res.send("Failed to login");
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/homePage.html");
});

https
  .createServer(
    {
      key: fs.readFileSync(__dirname + "/key.pem"),
      cert: fs.readFileSync(__dirname + "/cert.pem"),
    },
    app
  )
  .listen(3000, () => {
    console.log("Server started at port 3000");
  });
