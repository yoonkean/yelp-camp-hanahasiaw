var validationObj = {};
const { check, validationResult } = require('express-validator/check');

validationObj.register = [
    check('username').isLength({min: 5}).withMessage("Username must be longer than 5 characters"),
    check('password').isLength({min: 8}).withMessage("Password must be of minimum 8 characters"),
    check('email').isEmail().withMessage("Email entered is not valid")
    ];
    
validationObj.profile = [
    check('profile[email]').isEmail().withMessage("New email entered is not valid")
    ];

validationObj.campground = [
    check('price').isCurrency({digits_after_decimal: [2]}).withMessage("Please enter a valid price"),
    check('description').isLength({min: 1, max: 500}).withMessage("Please enter a description for your campground.")
    ];

module.exports = validationObj;