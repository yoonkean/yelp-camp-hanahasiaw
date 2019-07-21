var express = require("express");
var router = express.Router({ mergeParams: true });
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middleware = require("../middleware");
const { validationResult } = require('express-validator/check');
var validation = require("../middleware/validation");

// CREATE ROUTE - Add new comment into DB and associate it with campground
router.post("/", middleware.isLoggedIn, validation.comment, async function (req, res) {
	if (!validationResult(req).isEmpty()) {
		var validationError = validationResult(req).array()
		req.flash("errorList", validationError);
		return res.redirect('back');
	}

	try {
		var foundCampground = await Campground.findById(req.params.id);
		var newComment = await Comment.create(req.body.comment);

		newComment.author.id = req.user._id;
		newComment.author.username = req.user.username;
		newComment.save();

		foundCampground.comments.push(newComment);
		foundCampground.save();

		req.flash("success", "Successfully added comment");
	} catch (error) {
		req.flash("error", "Something went wrong");
	} finally {
		res.redirect('/campgrounds/' + req.params.id);
	}

});

//UPDATE ROUTE
router.put("/:comment_id", middleware.checkCommentOwnership, validation.comment, async function (req, res) {
	try {
		req.body.comment.createdAt = Date.now();
		await Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment);
		req.flash("success", "Successfully updated comment");
	} catch (error) {
		req.flash("error", "Something went wrong");
	} finally {
		res.redirect("/campgrounds/" + req.params.id);
	}
});

//DESTROY ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, async function (req, res) {
	try {
		await Comment.findByIdAndRemove(req.params.comment_id);
		req.flash("success", "Comment deleted successfully");
	} catch (error) {
		req.flash("error", "Something went wrong");
	} finally {
		res.redirect("back")
	}
});

module.exports = router;