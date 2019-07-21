var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Review = require("../models/review");
var middleware = require("../middleware");
var geocoder = require("../helpers/googleMapHelper");
var cloudinary = require('../helpers/cloudinaryHelper');
var upload = require("../helpers/imageHelper");
const { validationResult } = require('express-validator/check');
var validation = require("../middleware/validation.js");
var escapeRegex = require('../helpers/escapeRegexHelper');

//INDEX ROUTE - Display List of Campgrounds
router.get("/", async function (req, res) {
	try {
		var search = {};
		var page = req.query.page || 1;
		var count = Number(req.query.per_page) || 12;
		var offset = (count * page) - count;

		if (req.query.search) {
			const regex = new RegExp(escapeRegex(req.query.search), 'gi');
			search = { "name": regex };
		}

		var foundCampgrounds = await Campground.find(search)
			.skip(offset)
			.limit(count)
			.sort({ createdAt: -1 });

		var totalCampgrounds = await Campground.countDocuments({});
		var totalPages = Math.ceil(totalCampgrounds / count);

		if (page == 1) {
			res.render("campgrounds/index", { campgrounds: foundCampgrounds, totalPages: totalPages });
		} else {
			res.status(200);
			return res.send({ campgrounds: foundCampgrounds });
		}
	} catch (error) {
		console.log(error);
		return res.status(500).send("Something went wrong. Please try again later.");
	}
});

//NEW ROUTE - Display Form to Create New Campground
router.get("/new", middleware.isLoggedIn, function (req, res) {
	res.render("campgrounds/new");
});

//CREATE - Add new data to the database. (NOTE: Due to multipart-form, multer is needed to process the form body )
router.post("/", middleware.isLoggedIn, upload.single('image'), validation.campground, async function (req, res) {
	if (!validationResult(req).isEmpty()) {
		var validationError = validationResult(req).array();
		req.flash("errorList", validationError);
		return res.redirect('back');
	}

	try {
		var geocoderResult = await geocoder.geocode(req.body.campground.location);

		if (req.file) {
			var result = await cloudinary.uploader.upload(req.file.path);
			req.body.campground.image = result.secure_url;
			req.body.campground.imageId = result.public_id;
			req.body.campground.author = {
				id: req.user._id,
				username: req.user.username
			}
			req.body.campground.lat = geocoderResult[0].latitude;
			req.body.campground.lng = geocoderResult[0].longitude;
			req.body.campground.location = geocoderResult[0].formattedAddress;
		}

		var newCampground = await Campground.create(req.body.campground);
		req.flash("success", "Successfully added a new campground");
		res.redirect('campgrounds/' + newCampground.id);
	} catch (error) {
		console.log(error);
		req.flash("error", "Something went wrong");
		res.redirect('campgrounds');
	}
});

//SHOW ROUTE - Show more info about one campground
router.get("/:id", async function (req, res) {
	try {
		var foundCampground = await Campground.findById(req.params.id)
			.populate({
				path: 'comments',
				populate: { path: 'author.id', model: 'User' },
				options: { sort: { createdAt: -1 } }
			})
			.populate({
				path: 'reviews',
				options: { sort: { createdAt: -1 } }
			})

		res.render('campgrounds/show', { campground: foundCampground });
	} catch (error) {
		console.log(err);
		res.redirect('back');
	}
});

//EDIT ROUTE - Display edit campground form
router.get("/:id/edit", middleware.checkCampgroundOwnership, function (req, res) {
	res.render('campgrounds/edit', { campground: req.campground });
});

//UPDATE ROUTE - Update campground in the database.
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), validation.campground, async function (req, res) {
	if (!validationResult(req).isEmpty()) {
		var validationError = validationResult(req).array();
		req.flash("errorList", validationError);
		return res.redirect('/campgrounds/' + req.params.id + '/edit');
	}

	try {
		var geocoderResult = await geocoder.geocode(req.body.campground.location);
		var foundCampground = await Campground.findById(req.params.id);

		if (req.file) {
			await cloudinary.v2.uploader.destroy(foundCampground.imageId);
			var result = await cloudinary.v2.uploader.upload(req.file.path);
			req.body.campground.image = result.secure_url;
			req.body.campground.imageId = result.public_id;
		}
		req.body.campground.lat = geocoderResult[0].latitude;
		req.body.campground.lng = geocoderResult[0].longitude;
		req.body.campground.location = geocoderResult[0].formattedAddress;

		await Campground.findByIdAndUpdate(req.params.id, { $set: req.body.campground });
		req.flash("success", "Campground has been updated successfully");
		res.redirect('/campgrounds/' + req.params.id);
	} catch (error) {
		console.log(error.message);
		req.flash("error", "Something went wrong when updating campground. Please try again later");
		return res.redirect('/campgrounds/' + req.params.id + '/edit');
	}
});

//DESTROY ROUTE - Destroy campgrounds and all related references.
router.delete("/:id", middleware.checkCampgroundOwnership, async function (req, res) {
	try {
		//Find campground to remove all associated comment and reviews
		var campground = await Campground.findById(req.params.id)
			.populate('comments')
			.populate('reviews');

		//Delete reference associated to the campground
		await Comment.remove({ _id: { $in: campground.comments } });
		await Review.remove({ _id: { $in: campground.reviews } });

		//Delete campground after all associated data has been removed
		var deletedCampground = await Campground.findByIdAndRemove(req.params.id);
		await cloudinary.v2.uploader.destroy(deletedCampground.imageId);

		req.flash("success", "Successfully deleted " + deletedCampground.name);
		res.redirect('/campgrounds');
	} catch (error) {
		console.log(error.message);
		req.flash("error", "Something went wrong");
		res.redirect('/campgrounds');
	}
});

module.exports = router;