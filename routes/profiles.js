var express = require("express");
var router = express.Router();
var User = require("../models/user");
var passport = require("passport");
var Campground = require("../models/campground");
var middleware = require("../middleware");
var cloudinary = require('cloudinary');
var multer = require("multer");
const { check, validationResult } = require('express-validator/check');
var validation = require("../middleware/validation.js")

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter})

cloudinary.config({ 
  cloud_name: 'learntocodeyelpsyk', 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY
});

//SHOW ROUTE
router.get("/:id/profile", async function(req, res) {
    var page = req.query.page || 1;
    var count = req.query.per_page || 12;
    var offset = (count * page) - count;
    try {
        var user = await User.findById(req.params.id);
        var campgrounds = await Campground.find({}).skip(Number(offset)).limit(Number(count)).sort({createdAt: -1}).where("author.id").equals(user._id);
        var totalCampgrounds = await Campground.countDocuments({}).where("author.id").equals(user._id);
        var totalPages = Math.ceil(totalCampgrounds/count);
        res.render("profiles/show", {profile: user, campgrounds: campgrounds, totalPages: totalPages, currentPage: page});   
    } catch (error) {
        console.log(error);
        req.flash("error","Something went wrong. Please try again later");
        res.redirect("back");
    }
});

//EDIT ROUTE
router.get("/:id/profile/edit", middleware.checkProfileOwnership ,function(req, res) {
   res.render("profiles/edit");
});

//UPDATE ROUTE
router.put("/:id/profile", upload.single('avatar'), validation.profile, async function(req, res) {
    try {
        var validationError = validationResult(req).array();
        if(!validationResult(req).isEmpty()) {
            return res.render("profiles/edit", {"errorList": validationError});
        }
        var userFound = await User.findById(req.params.id);
        if(req.file) {
            if(userFound.avatarId) {
                await cloudinary.v2.uploader.destroy(userFound.avatarId);
            }
            var result = await cloudinary.uploader.upload(req.file.path);
            req.body.profile.avatarUrl = result.secure_url;
            req.body.profile.avatarId = result.public_id;
        }
        await User.findByIdAndUpdate(req.params.id, req.body.profile);
        req.flash("success","Your profile has been updated.");
        res.redirect("profile");
    } catch (error) {
        console.log(error);
        req.flash("error", "Something went wrong, please try again later");
        res.redirect("profile");
    }
});

module.exports = router;