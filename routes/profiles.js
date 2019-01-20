var express = require("express");
var router = express.Router();
var User = require("../models/user");
var Campground = require("../models/campground");
var middleware = require("../middleware");
var cloudinary = require('../helpers/cloudinaryHelper');
var upload = require("../helpers/imageHelper");
const { validationResult } = require('express-validator/check');
var validation = require("../middleware/validation.js")

//SHOW ROUTE
router.get("/:id/profile", async function(req, res) {
    var page = req.query.page || 1;
    var count = Number(req.query.per_page) || 12;
    var offset = (count * page) - count;

    try {
        var user = await User.findById(req.params.id);

        var foundCampgrounds = await Campground.find({})
            .skip(offset)
            .limit(count)
            .sort({createdAt: -1})
            .where("author.id").equals(user._id);

        var totalCampgrounds = await Campground.countDocuments({})
            .where("author.id")
            .equals(user._id);

        var totalPages = Math.ceil(totalCampgrounds/count);
        res.render("profiles/show", {
            profile: user, 
            campgrounds: foundCampgrounds,
            totalPages: totalPages, 
            currentPage: page
        });   
    } catch (error) {
        console.log(error);
        req.flash("error", "Something went wrong. Please try again later");
        res.redirect('back');
    }
});

//EDIT ROUTE
router.get("/:id/profile/edit", middleware.checkProfileOwnership ,function(req, res) {
   res.render("profiles/edit");
});

//UPDATE ROUTE
router.put("/:id/profile", upload.single('avatar'), validation.profile, async function(req, res) {
    if(!validationResult(req).isEmpty()) {
        var validationError = validationResult(req).array();
        return res.render("profiles/edit", {"errorList": validationError});
    }

    try {
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
    } catch (error) {
        console.log(error);
        req.flash("error", "Something went wrong, please try again later");
    } finally {
        res.redirect('profile');
    }
});

module.exports = router;