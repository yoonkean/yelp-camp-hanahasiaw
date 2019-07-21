var validationObj = {};
const { check } = require('express-validator/check');

validationObj.register = [
	check('username').isLength({ min: 5 }).withMessage("Username must be longer than 5 characters"),
	check('password').isLength({ min: 8 }).withMessage("Password must be of minimum 8 characters"),
	check('email').isEmail().withMessage("Email entered is not valid")
];

validationObj.profile = [
	check('profile[email]').isEmail().withMessage("New email entered is not valid")
];

validationObj.campground = [
	check('campground[name]').isLength({ min: 1, max: 255 }).withMessage("Please enter a name for your campground."),
	check('campground[price]').isCurrency({ digits_after_decimal: [2] }).withMessage("Please enter a valid price"),
	check('campground[location]').isLength({ min: 1, max: 255 }).withMessage("Please enter a valid location."),
	check('campground[description]').isLength({ min: 1, max: 500 }).withMessage("Please enter a description for your campground.")
];

validationObj.comment = [
	check('comment[text]').isLength({ min: 1 }).withMessage("Please enter your comment in the text area."),
]

module.exports = validationObj;