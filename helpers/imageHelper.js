var multer = require("multer");

var storage = multer.diskStorage({
    filename: function(req, file, cb) {
      cb(null, Date.now() + file.originalname);
    }
  });
  
var imageFilter = function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

module.exports = multer({ storage: storage, fileFilter: imageFilter})
