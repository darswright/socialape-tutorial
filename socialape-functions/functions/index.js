const functions = require("firebase-functions");

const app = require("express")();

const FBAuth = require("./utils/fbauth");

const { getAllScreams, postOneScream } = require("./handlers/screams");
const { signup, login } = require("./handlers/users");

// Scream Routes
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);

// User Routes
app.post("/signup", signup);
app.post("/login", login);

exports.api = functions.region("australia-southeast1").https.onRequest(app);
