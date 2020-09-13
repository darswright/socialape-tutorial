const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const app = express();

admin.initializeApp();

const firebaseConfig = {
    apiKey: "AIzaSyCvC3D2dSgfPRWtqwtvWX6NFFxAxSxNAfI",
    authDomain: "socialape-5121f.firebaseapp.com",
    databaseURL: "https://socialape-5121f.firebaseio.com",
    projectId: "socialape-5121f",
    storageBucket: "socialape-5121f.appspot.com",
    messagingSenderId: "102333852698",
    appId: "1:102333852698:web:74f9366ded9bcbd13875a3",
    measurementId: "G-8N79C94RR7",
};

const firebase = require("firebase");
const { user } = require("firebase-functions/lib/providers/auth");
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get("/screams", (req, res) => {
    db.collection("screams")
        .orderBy("createdAt", "desc")
        .get()
        .then((data) => {
            let screams = [];

            data.forEach((doc) => {
                screams.push({
                    screamId: doc.id,
                    ...doc.data(),
                });
            });

            return res.json(screams);
        })
        .catch((err) => console.log(err));
});

app.post("/scream", (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString(),
    };

    db.collection("screams")
        .add(newScream)
        .then((doc) => {
            res.json({ message: `document ${doc.id} created successfully` }).catch((err) => {
                res.status(500).json({ error: "something went wrong" });
                console.error(err);
            });
        });
});

const isEmpty = (string) => {
    if (string.trim() === "") return true;
    else return false;
};

const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(emailRegEx)) return true;
    else return false;
};

app.post("/signup", (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    let errors = {};

    if (isEmpty(newUser.email)) {
        errors.email = "Email must not be empty";
    } else if (!isEmail(newUser.email)) {
        errors.email = "Must be a valid address";
    }

    if (isEmpty(newUser.password)) errors.password = "Must not be empty";

    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = "Passwords must match";

    if (isEmpty(newUser.handle)) errors.handle = "Must not be empty";

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    let token, userId;

    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res.status(400).json({ handle: "this handle is already taken" });
            } else {
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId,
            };
            db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch((err) => {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
                return res.status(400).json({ email: "Email is already in use" });
            } else {
                return res.status(500).json({ error: err.code });
            }
        });
});

app.post("/login", (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };

    let errors = {};

    if (isEmpty(user.email)) errors.email = "Must not be empty";
    if (isEmpty(user.password)) errors.password = "Must not be empty";

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.json({ token });
        })
        .catch((err) => {
            console.error(err);
            if (err.code === "auth/wrong-password") {
                return res.status(403).json({ general: "Wrong credentials, please try again" });
            } else return res.status(500).json({ error: err.code });
        });
});

exports.api = functions.region("australia-southeast1").https.onRequest(app);