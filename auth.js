var passport = require("passport");
var localStrategy = require("passport-local");
var User = require("./models/user");

module.exports = function (app) {
    //Setting passport up
    app.use(require("express-session")({
        secret: "The secret to the campground world",
        resave: false,
        saveUninitialized: false
    }));
    
    app.use(
        passport.initialize(),
        passport.session(),
    );

    passport.use(new localStrategy(User.authenticate()));
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
}