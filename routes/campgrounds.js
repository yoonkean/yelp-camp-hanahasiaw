var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var Review = require("../models/review");
var middleware = require("../middleware");
var NodeGeocoder = require("node-geocoder");
var cloudinary = require('cloudinary');
var multer = require("multer");
const { check, validationResult } = require('express-validator/check');
var validation = require("../middleware/validation.js");

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

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

//INDEX ROUTE - Display List of Campgrounds
router.get("/", async function(req, res) {
   var search = {};
   var count = Number(req.query.per_page) || 12;
   var page = req.query.page || 1;
   var offset = (count * page) - count;
   try {
      //Initialized regex with global(all matches) and case insensitive option.
      if(req.query.search) {
         const regex = new RegExp(escapeRegex(req.query.search), 'gi');
         search = {"name": regex};
      }
      var foundCampgrounds = await Campground.find(search).skip(offset).limit(count).sort({createdAt: -1});
      var totalCampgrounds = await Campground.countDocuments({});
      var totalPages = Math.ceil(totalCampgrounds/count);
      if(page == 1) {
         res.render("campgrounds/index", {campgrounds: foundCampgrounds, totalPages: totalPages});
      } else {
         res.status(200);
         return res.send({campgrounds: foundCampgrounds});  
      }
   } catch (error) {
      console.log(error);
      return res.status(404).send("Something went wrong. Please try again later.");
   }
});

//NEW ROUTE - Display Form to Create New Campground
router.get("/new", middleware.isLoggedIn, function(req, res) {
   res.render("campgrounds/new");
});

//CREATE - Add new data to the database. (NOTE: Due to multipart-form, multer is needed to process the form body )
router.post("/", middleware.isLoggedIn, upload.single('image'), validation.campground, function(req, res) {
   //Save data from form into a new camp object
   var name = req.body.name;
   var price = req.body.price;
   var image = req.body.image;
   var desc = req.body.description;
   var author = {
      id: req.user._id,
      username: req.user.username
   }

   if(!validationResult(req).isEmpty()) {
      var validationError = validationResult(req).array()
      req.flash("errorList", validationError);
      return res.redirect("back");
   }

   geocoder.geocode(req.body.location, function(err, data) {
      if(err || !data.length ) {
         req.flash("error", "Invalid address. Please try again.");
         return res.redirect('back');
      }  
      var lat= data[0].latitude;
      var lng = data[0].longitude;
      var location = data[0].formattedAddress;
      var newCamp = {name: name, price: price, image: image, description: desc, author: author, location: location, lat: lat, lng: lng};
      
      cloudinary.uploader.upload(req.file.path, function(result) {
         // add cloudinary url for the image to the campground object under image property
         newCamp.image = result.secure_url;
         newCamp.imageId = result.public_id;
         //Create a new campground and insert to DB
         Campground.create(newCamp, function(err, newCampground) {
            if(err) {
               console.log(err);
               req.flash("error","Something went wrong");
               res.redirect("campgrounds");
            } else {
               //Redirect to campground page
               req.flash("success", "Successfully added a new campground");
               res.redirect("campgrounds/" + newCampground.id);
            }
         });
      });
   });
});

//SHOW ROUTE - Show more info about one campground
router.get("/:id", function(req, res) {
   //Find the campground with provided ID
   Campground.findById(req.params.id)
      .populate({path: "comments", populate: {path: "author.id", model: "User"},options: {sort: {createdAt: -1}}})
      .populate({path: "reviews",options: {sort: {createdAt: -1}}
   }).exec(function(err, campground){
        if(err) {
            console.log(err);
         } else {
            res.render("campgrounds/show", {campground: campground});
         } 
   });
});

//EDIT ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res) {
      res.render("campgrounds/edit", {campground: req.campground});  
});

//UPDATE ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res) {
   // Using geocoder api to convert location to coordinates to be stored in database.
   geocoder.geocode(req.body.location, async function(err, data) {
      //Check it's a valid location.
      if(err || !data.length ) {
         req.flash("error", "Invalid address");
         return res.redirect('back');
      }
      try {
         var foundCampground = await Campground.findById(req.params.id);
         if(req.file) {
               await cloudinary.v2.uploader.destroy(foundCampground.imageId);
               var result = await cloudinary.v2.uploader.upload(req.file.path);
               req.body.campground.image = result.secure_url;
               req.body.campground.imageId = result.public_id;
         }
         req.body.campground.lat = data[0].latitude;
         req.body.campground.lng = data[0].longitude;
         req.body.campground.location = data[0].formattedAddress;
         await Campground.findByIdAndUpdate(req.params.id,{$set: req.body.campground});
         req.flash("success", "Campground has been updated successfully");
         res.redirect("/campgrounds/" + req.params.id);
      } catch (error) {
            console.log(error.message);
            req.flash("error", "Something went wrong when updating campground. Please try again later");
            return res.redirect('back');
      }
   });
});

//DESTROY ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, async function(req, res) {
   try {
      //Find campground to remove all associated comment and reviews
      var campground = await Campground.findById(req.params.id).populate('comments').populate('reviews');
      await Comment.remove({_id: {$in: campground.comments }});
      await Review.remove({_id: {$in: campground.reviews }});
      
      //Delete campground after all associated data has been removed
      var deletedCampground = await Campground.findByIdAndRemove(req.params.id);
      await cloudinary.v2.uploader.destroy(deletedCampground.imageId);
      
      req.flash("success", "Successfully deleted " + deletedCampground.name);
      res.redirect("/campgrounds");
   } catch(error) {
      console.log(error.message);
      req.flash("error", "Something went wrong");
      res.redirect("/campgrounds");
   }
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;