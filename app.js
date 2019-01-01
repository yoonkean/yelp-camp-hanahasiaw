//==============================
// Libraries
//==============================
require('dotenv').config();
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var methodOverride = require("method-override");
var flash = require("connect-flash");
var moment = require("moment");
var nodemon = require("nodemon");

//==============================
// Models
//==============================
var Campground = require("./models/campground");
var Comment = require("./models/comment");
var User = require("./models/user");


//==============================
// Routes
//==============================
var commentRoutes = require("./routes/comments");
var campgroundRoutes = require("./routes/campgrounds");
var authRoutes = require("./routes/index");
var reviewRoutes = require("./routes/reviews");
var profileRoutes = require("./routes/profiles");

//Seeding database for development
var seedDB = require("./seeds");

var app = express();

mongoose.connect("mongodb://localhost/yelp_camp", {useNewUrlParser: true});
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

//Setting passport up
app.use(require("express-session")({
   secret: "The secret to the campground world",
   resave: false,
   saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

//Setting up configurations required for reading/encoding/decoding sessions
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//seedDB();

//Call this middleware for every single route
app.use(function(req, res, next) {
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.errorList = req.flash("errorList");
   res.locals.success = req.flash("success");
   res.locals.moment = moment;
   next();
});

//Use required routes
app.use(authRoutes);
app.use("/users", profileRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);

console.log(process.version);

app.listen(process.env.PORT, process.env.IP, function () {
   console.log("The YelpCamp Server Has Started!"); 
});