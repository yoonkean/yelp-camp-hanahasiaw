var Comment = require("../models/comment.js");
var Campground = require("../models/campground.js");
var Review = require("../models/review.js");
var User = require("../models/user.js");
var middlewareObj = {};

const UNAUTHORIZED_ERROR = "You need to be logged in to do that!";
const PERMISSION_ERROR = "You don't have permission to do that!";
const DEFAULT_ERROR = "Something went wrong. Please try again later.";

function handlePermissionError(req, res, redirectTo) {
	req.flash("error", PERMISSION_ERROR);
	res.redirect(redirectTo);
}

function handleUnauthorizedError(req, res, redirectTo) {
	req.flash("error", UNAUTHORIZED_ERROR);
	res.redirect(redirectTo);
}

function handleDefaultError(req, res, redirectTo) {
	req.flash("error", PERMISSION_ERROR);
	res.redirect(redirectTo);
}

//Middleware to check if user is logged in before perform the next action
middlewareObj.isLoggedIn = function (req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		handleUnauthorizedError(req, res, '/login')
	}
};

middlewareObj.checkCommentOwnership = async function checkCommentOwnership(req, res, next) {
	try {
		if (req.isAuthenticated()) {
			var foundComment = await Comment.findById(req.params.comment_id);
			if (foundComment.author.id.equals(req.user._id)) {
				req.comment = foundComment;
				next();
			} else {
				handlePermissionError(req, res, '/campgrounds/' + req.params.id);
			}
		} else {
			handleUnauthorizedError(req, res, '/login')
		}
	} catch (error) {
		handleDefaultError(req, res, 'back');
	}
};

//Middleware to check if campground belongs to user
middlewareObj.checkCampgroundOwnership = async function checkCampgroundOwnership(req, res, next) {
	try {
		if (req.isAuthenticated()) {
			var foundCampground = await Campground.findById(req.params.id);
			if (foundCampground.author.id.equals(req.user._id)) {
				req.campground = foundCampground;
				next();
			} else {
				handlePermissionError(req, res, '/campgrounds/' + req.params.id);
			}
		} else {
			handleUnauthorizedError(req, res, '/login');
		}
	} catch (error) {
		handleDefaultError(req, res, '/campgrounds/' + req.params.id)
	}
};

middlewareObj.checkReviewOwnership = async function checkReviewOwnership(req, res, next) {
	try {
		if (req.isAuthenticated()) {
			var foundReview = await Review.findById(req.params.review_id);
			if (foundReview.author.id.equals(req.user._id)) {
				req.review = foundReview;
				next();
			} else {
				handlePermissionError(req, res, '/campgrounds/' + req.params.id);
			}
		} else {
			handleUnauthorizedError(req, res, '/login');
		}
	} catch (error) {
		handleDefaultError(req, res, '/campgrounds/' + req.params.id)
	}
};

middlewareObj.checkProfileOwnership = async function checkProfileOwnership(req, res, next) {
	try {
		if (req.isAuthenticated()) {
			var foundProfile = await User.findById(req.params.id);
			if (foundProfile._id.equals(req.user._id)) {
				req.userDetails = foundProfile;
				next();
			} else {
				handlePermissionError(req, res, '/users/' + req.params.id + '/profile');
			}
		} else {
			handleUnauthorizedError(req, res, '/login');
		}
	} catch (error) {
		console.log(error);
		handleDefaultError(req, res, '/users/' + req.params.id + '/profile');
	}
};

module.exports = middlewareObj;