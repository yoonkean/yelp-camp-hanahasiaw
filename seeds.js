var mongoose = require("mongoose");
var Campground = require("./models/campground");
var Comment = require("./models/comment");
var Review = require("./models/review");
var User = require("./models/user");
var faker = require("faker");


async function seedDB() {
    try {
        await Comment.remove({});
        console.log("removed comments");
        await Review.remove({});
        console.log("removed reviews");
        await Campground.remove({});
        console.log("removed campgrounds");
        await User.remove({});
        console.log("removed users");
        
        var newUser = new User({
          username: "admin",
          firstname: "admin",
          lastname: "test",
          email: "admin@example.com",
          avatarUrl: "https://res.cloudinary.com/learntocodeyelpsyk/image/upload/v1542878181/default_profile_image.jpg"
        });
       
        var user = await User.register(newUser, "1234");
        console.log("Created test user")
         
        var campgroundSeeds = [];
    
        for (var i = 0; i < 100; i++) {
            var campground = {
                    name: faker.lorem.words(),
                    price: faker.commerce.price(),
                    image: "https://res.cloudinary.com/learntocodeyelpsyk/image/upload/v1543483207/xby5ydnzyml3w3hxns9d.jpg",
                    imageId: "xby5ydnzyml3w3hxns9d.jpg",
                    description: faker.lorem.paragraphs(),
                    author: {
                        id: user.id,
                        username: user.username
                    }
                };
            campgroundSeeds.push(campground);
        }
        console.log("Initialized camgrouds");
        console.log(campgroundSeeds);
        
        for(const seed of campgroundSeeds) {
            var campgroundSeed = await Campground.create(seed);
            console.log("Created campground")
            
            var comment = await Comment.create({
                text: faker.lorem.sentence(),
                author: {
                    id: user.id,
                    username: user.username
                }
            });
            console.log("Added comment")

            
            var review = await Review.create({
                rating: faker.random.number({
                            'min': 1,
                            'max': 5
                        }),
                text: faker.lorem.sentence(),
                author: {
                    id: user.id,
                    username: user.username
                }
            });
            console.log("Added review")
            
            review.campground = campgroundSeed;
            review.save();
            
            campgroundSeed.rating = review.rating;
            campgroundSeed.comments.push(comment);
            campgroundSeed.reviews.push(review);
            campgroundSeed.save();
        }
        
    } catch (error) {
        console.log(error.message);
    }
    
    
    

}

module.exports = seedDB;