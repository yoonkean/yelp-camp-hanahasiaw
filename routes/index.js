var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var nodeMailer = require("nodemailer");
var crypto = require("crypto");
const { check, validationResult } = require('express-validator/check');
var validation = require("../middleware/validation.js");
const util = require('util');

router.get("/", function(req, res) {
   res.render("landing");
});

//NEW ROUTE - Display Form to register new user
router.get("/register", function(req, res) {
   res.render("register"); 
});

//CREATE ROUTE - Handle registration logic
router.post("/register", validation.register, function(req, res) {
   var validationError = validationResult(req).array();
   
   if (!validationResult(req).isEmpty()) {
      return res.render("register", {"errorList": validationError});
   }
   
   var newUser = new User({
      username: req.body.username,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      avatarUrl: "https://res.cloudinary.com/learntocodeyelpsyk/image/upload/v1542878181/default_profile_image.jpg"
   });
   
   // Method from passport local mongoose libary to register user
   User.register(newUser, req.body.password, function(err, user) {
      if(err) {
         return res.render("register", {"error": err.message});
      }
      
      //Authenticate entered crendentials and login the user
      passport.authenticate("local")(req, res, function() {
         res.redirect("/campgrounds");
      });
   });
   
})

// NEW ROUTE - Display Form to login  user
router.get("/login", function(req, res) {
   res.render("login"); 
});

//Handle login logic
router.post("/login", passport.authenticate("local", {
   successRedirect: "/campgrounds",
   failureRedirect: "/login",
   failureFlash: true
}),function(req, res) {
   
});

//Logout user from the web application
router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "Logged out successfully!")
    res.redirect("/campgrounds");
})

//Show forgot password page
router.get("/forgot", function(req, res) {
   res.render("forgot", {sentMessage: undefined});
});

//Handle forgot password login
//- Creates unique token and set it's expiry time
//- Send user email with reset password link using token
router.post("/forgot", async function(req, res) {
   try {
      var buf = await crypto.randomBytes(20);
      var token = buf.toString('hex');
      
      var foundUser = await User.findOne({email: req.body.email});
      if (!foundUser) {
         req.flash('error', 'No account with that email address exists');
         return res.redirect('/forgot');
      }
      
      foundUser.resetPasswordToken = token;
      foundUser.resetPasswordExpires = Date.now() + 3600000;
      foundUser.save();
      
      var smtpTransport = await nodeMailer.createTransport({
         service: 'Gmail',
         auth: {
            user: process.env.EMAIL,
            pass: process.env.GMAILPW
         }
      });

      var mailOptions = {
         to: foundUser.email,
         from: process.env.EMAIL,
         subject: "YelpCamp by Yoon Kean Password Reset",
         text : 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      
      await smtpTransport.sendMail(mailOptions);
      console.log('mail.sent');
      var sentMessage = 'An email has been sent to ' + foundUser.email + ' with further instructions.'
      res.render('forgot', {sentMessage: sentMessage});
   } catch (error) {
      console.log(error);
      req.flash('error', 'Something went wrong. Please try again later.');
      return res.redirect('/forgot');
   }
})

//Show user reset password page if token exist and has not expired.
router.get("/reset/:token", async function(req, res) {
   try {
      var user = await User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}});
      if(!user) {
         req.flash('error', 'Password reset token is invalid or has expired.');
         return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
   } catch (error) {
      console.log(error);
      req.flash('error', 'Something went wrong. Please try again later.');
      return res.redirect('/forgot');
   }
})

//Handle reset password logic
// - Check if token exist and has not expired
// - Save new password to database and remove token and it's expiry time
// - Send email to user if password reset is successful
router.post("/reset/:token", async function(req, res) {
   try {
      var user = await User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}});
      
      if(!user) {
         req.flash('error', 'Password reset token is invalid or has expired.');
         return res.redirect('/forgot');
      }
      
      if(req.body.password === req.body.confirm) {
         await user.setPassword(req.body.password);
         user.resetPasswordToken = undefined;
         user.resetPasswordExpires = undefined;
         user.save(function(err) {
            if (err) { throw err }
            req.login(user, function(err) {
               if (err) { throw err }
            });
         });
      } else {
         req.flash('error', 'Passwords do not match.');
         return res.redirect('back');
      }
      
      var smtpTransport = nodeMailer.createTransport({
         service: 'Gmail',
         auth: {
            user: process.env.EMAIL,
            pass: process.env.GMAILPW
         }
      });
      
      var mailOptions = {
        to: user.email,
        from: 'process.env.EMAIL',
        subject: 'Your password has been changed',
        text: 'Hello ' + user.username + ',\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      
      await smtpTransport.sendMail(mailOptions);
      req.flash('success', 'Success! Your password has been changed.');
      res.redirect("/campgrounds");
   } catch (error) {
      req.flash('error', 'Something went wrong. Please try again later.');
      return res.redirect('/reset/' + req.params.token);
   }
});

module.exports = router;