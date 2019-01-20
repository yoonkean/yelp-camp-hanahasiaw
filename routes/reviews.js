var express = require("express");
var router = express.Router({mergeParams: true});
var Campground = require("../models/campground");
var Review = require("../models/review");
var middleware = require("../middleware");

//NEW
router.get("/new", middleware.isLoggedIn, function(req, res) {
   res.render("reviews/new", {campground_id: req.params.id});
});

//SHOW
router.get("/", async function(req, res) {
    try {
        var count = 5;
        var page = req.query.page || 1;
        var offset = (count * page) - count;
        
        var foundReviews = await Review.find({})
            .skip(offset)
            .limit(count)
            .sort({createdAt: -1})
            .populate({
                path: 'author.id',
                model: 'User'
            }).where("campground").equals(req.params.id);
            
        var total = await Review.countDocuments({campground: req.params.id});
        var totalPages = Math.ceil(total/count);
        res.send({reviews: foundReviews, currentPage: page, totalPages: totalPages});
    } catch (error) {
        console.log(error);    
    }
});

//CREATE
router.post("/", middleware.isLoggedIn, async function(req, res) {
    try {
        var foundCampground = await Campground.findById(req.params.id).populate("reviews");
        var newReview = await Review.create(req.body.review);

        newReview.author.id = req.user._id;
        newReview.author.username = req.user.username;
        newReview.campground = foundCampground;
        newReview.save();

        foundCampground.reviews.push(newReview);
        foundCampground.rating = calculateAverage(foundCampground.reviews);
        foundCampground.save();

        req.flash("success", "Your review has been successfully added ");
    } catch (error) {
        req.flash("error", "Something went wrong. Please try again later.");
    } finally {
        res.redirect("/campgrounds/" + req.params.id);
    }
});

//EDIT ROUTE
router.get("/:review_id/edit",function(req, res) {
    res.render("reviews/edit", {campground_id: req.params.id, review_id: req.params.review_id});
});

//USER shouldn't be allowed to delete their own review. This feature will be back for admin use.
// //DELETE ROUTE
// router.delete("/:review_id", middleware.checkReviewOwnership, async function(req, res) {
//     try {
//         var removedReview = await Review.findByIdAndRemove(req.params.review_id);
//         var foundCampground = await Campground.findById(req.params.id).populate("reviews");

//         foundCampground.rating = calculateAverage(foundCampground.reviews);
//         foundCampground.save();

//         req.flash("success", "Successfully deleted review");
//     } catch (error) {
//         req.flash("error", "Something went wrong. Please try again later.");
//     } finally {
//         res.redirect("back");
//     }
//});

// USER shouldn't be allowed to update their own review. This feature will be back for admin use.
// //UPDATE ROUTE
// router.put("/:review_id", middleware.checkReviewOwnership, async function(req, res) {
//     try {
//         var updatedReview = await Review.findByIdAndUpdate(req.params.review_id, req.body.review);
//         req.flash("success", "Review has been successfully updated !");
//         res.redirect("/campgrounds/" + req.params.id);
//     } catch (error) {
//         req.flash("error", "Something went wrong. Please try again later.");
//     }
// });

function calculateAverage(reviews) {
    var total = 0;
    
    if(reviews.length === 0) {
        return 0;
    }
    
    reviews.forEach(function(review) {
        total += review.rating;
    });
    
    return  total = total / reviews.length;
}

module.exports = router;