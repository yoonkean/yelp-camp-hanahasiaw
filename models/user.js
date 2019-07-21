var mongoose = require("mongoose"),
	passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
	username: { type: String, unique: true, required: true },
	passport: String,
	lastname: String,
	firstname: String,
	email: { type: String, unique: true, required: true },
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	avatar: String,
	avatarUrl: String,
	avatarId: String,
	createdAt: {
		type: Date,
		default: Date.Now
	}
});

//Add passport local mongoose package functions to UserSchema - to user the library functions
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);