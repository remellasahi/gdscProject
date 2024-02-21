const express = require("express");
const app = express();
const session = require("express-session");
const ejs = require("ejs");
const passwordHash = require("password-hash");
const fileUpload = require("express-fileupload");
const { Storage } = require("@google-cloud/storage");
const twilio = require('twilio');
const dotenv = require('dotenv');
dotenv.config()

// Initialize Firebase Storage
const storage = new Storage({
  projectId: "project-v-ecea3",
  keyFilename: "./key.json",
});
const bucket = storage.bucket("gs://project-v-ecea3.appspot.com");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  }),
);

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

var serviceAccount = require("./key.json");
initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();

app.use(fileUpload()); // Add the fileUpload middleware

app.get("/", function (req, res) {
  res.render("signup.ejs", { errormessage: "" });
});
var FullName ="";
app.get("/signupsubmit", function (req, res) {
  db.collection("usersDemo")
    .where("Email", "==", req.query.email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        res.render("signup.ejs", {
          errormessage: "This account is already existed,Please login",
          user: "",
        });
      } else {
        db.collection("usersDemo")
          .add({
            FullName: req.query.fullname,
            Email: req.query.email,
            Password: passwordHash.generate(req.query.password),
          })
          .then(() => {
            res.render("login.ejs");
          });
      }
    });
});

app.get("/loginsubmit", function (req, res) {
  db.collection("usersDemo")
    .where("Email", "==", req.query.email)
    .get()
    .then((docs) => {
      let verified = false;
      docs.forEach((doc) => {
        // Set the authentication flag in the session
        verified = passwordHash.verify(req.query.password, doc.data().Password);
      });
      if (verified) {
        req.session.authenticated = true;
        res.redirect("/dashboard");
      } else {
        res.send("login unsuccessful");
      }
    });
});

app.get("/login", function (req, res) {
  res.render("login.ejs");
});

app.get("/dashboard", function (req, res) {
  if (req.session.authenticated) {
    res.render("dashboard.ejs", { user: FullName });
  } else {
    res.redirect("/login"); // Redirect to login if not authenticated
  }
});
app.get("/perf", function(req,res){
    res.render("perf.ejs");
  });
  app.get("/hospital", function(req,res){
    res.render("hospital.ejs");
  });
  app.get("/report", function(req,res){
    res.render("report.ejs");
  });

async function sendSMS(){
    const client = new twilio(process.env.TWILIO_SID , process.env.TWILIO_AUTH_TOKEN);
    return client.messages
    .create({body:'Alert!! Suspicious activity has been noticied.',from:'+16592157942' ,to: process.env.PHONE_NUMBER})
    .then(message => {
        console.log(message ,"Message sent")
    })
    .catch(err => { console.log(err, "Message not sent")
    })

    
}

sendSMS();
app.listen(3010, (req, res) => {
  console.log("App listening on port 3010");
});
