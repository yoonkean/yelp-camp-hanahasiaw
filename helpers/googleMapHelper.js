var NodeGeocoder = require("node-geocoder");

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
module.exports =  geocoder = NodeGeocoder(options);