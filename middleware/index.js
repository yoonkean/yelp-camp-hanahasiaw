var Comment = require("../models/comment.js");
var Campground = require("../models/campground.js");
var Review = require("../models/review.js");
var User = require("../models/user.js");
var middlewareObj = {};

//Middleware to check if user is logged in before perform the next action
middlewareObj.isLoggedIn = function(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash("error","You need to be logged in to do that!")
    res.redirect("/login");
};

middlewareObj.checkCommentOwnership = function(req, res, next) {
   if(req.isAuthenticated()) {
      Comment.findById(req.params.comment_id, function(err, foundComment) {
         if(err || !foundComment) {
            req.flash("error","Something went wrong");
            res.redirect("back");
         } else {
            // use mongoose equals method because foundCampground is an Mongoose Object
            if(foundComment.author.id.equals(req.user._id)) {
               req.comment = foundComment;
               next();
            } else {
               req.flash("error","You don't have permission to do that!");
               res.redirect("back");
            }
         }
      });
   } else {
      req.flash("error","You need to be logged in to do that!");
      res.redirect("back");
   }
};

//Middleware to check if campground belongs to user
middlewareObj.checkCampgroundOwnership = function checkCampgroundOwnership(req, res, next) {
   if(req.isAuthenticated()) {
      Campground.findById(req.params.id, function(err, foundCampground) {
         if(err || !foundCampground) {
            req.flash("error","Something went wrong");
            res.redirect("back");
         } else {
            // use mongoose equals method because foundCampground is an Mongoose Object
            //Check if campground belong to user
            if(foundCampground.author.id.equals(req.user._id)) {
               req.campground = foundCampground;
               next();
            } else {
               req.flash("error","You don't have permission to do that!");
               res.redirect("back");
            }
         }
      });
   } else {
      req.flash("error","You need to be logged in to do that!");
      res.redirect("back");
   }
};

middlewareObj.checkReviewOwnership = function checkReviewOwnership(req, res, next) {
  if(req.isAuthenticated()) {
     Review.findById(req.params.review_id, function(err, foundReview) {
        if(err || !foundReview) {
           req.flash("error", "Something went wrong");
        } else {
           if(foundReview.author.id.equals(req.user._id)) {
              req.review = foundReview;
              next();
           } else {
              req.flash("error", "You don't have permission to do that!");
              res.redirect("back");
           }
        }
     });
  } else {
     req.flash("error","You need to be logged in to do that!");
     res.redirect("back");
  }
};

middlewareObj.checkProfileOwnership = function checkProfileOwnership(req, res, next) {
   if(req.isAuthenticated()) {
      User.findById(req.params.id, function(err, foundUser) {
         if(err || !foundUser) {
            req.flash("error", "Something went wrong");
         } else {
           if(foundUser._id.equals(req.user._id)) {
              req.userDetails = foundUser;
              next();
           } else {
              req.flash("error", "You don't have permission to do that!");
              res.redirect("/campgrounds");
           }
         }
      });
   } else {
      req.flash("error","You need to be logged in to do that!");
      res.redirect("/campgrounds");
   }
};


                                        
module.exports = middlewareObj;