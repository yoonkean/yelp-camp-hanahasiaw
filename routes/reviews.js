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
    var count = 5;
    var page = req.query.page || 1;
    var offset = (count * page) - count;
    try {
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
router.post("/", middleware.isLoggedIn, function(req, res) {
    
    //Look up the campground ID
    Campground.findById(req.params.id).populate("reviews").exec(function(err, foundCampground) {
        if(err) {
            req.flash("err", err.message);
        }
        //Create Review in Database
        Review.create(req.body.review, function(err, newReview) {
            if(err) {
                req.flash("err", err.message);
            }
            // To form association - Save Author and campground details to newly created review and save.
            newReview.author.id = req.user._id;
            newReview.author.username = req.user.username;
            newReview.campground = foundCampground;
            newReview.save();
            
            //To form association - Save newly created review to campground and save
            foundCampground.reviews.push(newReview);
            foundCampground.rating = calculateAverage(foundCampground.reviews);
            foundCampground.save();
            
            req.flash("success", "Your review has been successfully added ");
            res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

//EDIT ROUTE
router.get("/:review_id/edit",function(req, res) {
    res.render("reviews/edit", {campground_id: req.params.id, review_id: req.params.review_id});
});

//UPDATE ROUTE
router.put("/:review_id", middleware.checkReviewOwnership, function(req, res) {
    Review.findByIdAndUpdate(req.params.review_id, req.body.review, function(err, updatedReview) {
        if (err) {
            req.flash("error", err.message);
        } else {
            req.flash("success", "Review has been successfully updated !");
            res.redirect("/campgrounds/" + req.params.id);
        }
    })
});

//DELETE ROUTE
router.delete("/:review_id", middleware.checkReviewOwnership, function(req, res) {
   Review.findByIdAndRemove(req.params.review_id, function(err) {
       if(err) {
           req.flash("error", err.message);
       } else {
            Campground.findById(req.params.id).populate("reviews").exec(function(err, foundCampground) {
                if(err) {
                    req.flash("error", err.message);
                }
                foundCampground.rating =  calculateAverage(foundCampground.reviews);
                foundCampground.save();
                req.flash("success", "Successfully deleted review");
                res.redirect("back");  
            });
       }
   });
});

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