require('dotenv').config();
require("nodemon");
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var flash = require("connect-flash");
var moment = require("moment");
var commentRoutes = require("./routes/comments");
var campgroundRoutes = require("./routes/campgrounds");
var authRoutes = require("./routes/index");
var reviewRoutes = require("./routes/reviews");
var profileRoutes = require("./routes/profiles");
var seedDB = require("./seeds");

var app = express();

mongoose.connect(process.env.MONGO_DB_URL, {useNewUrlParser: true});
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

require("./auth")(app);

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

app.listen(process.env.PORT || 3000, process.env.IP, function () {
   console.log("The YelpCamp Server Has Started!"); 
});