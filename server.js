//#############################################################
//##################### Require Packages ########3#############
//#############################################################
require('dotenv').config();
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var chalk = require('chalk');
var morgan  = require('morgan');
var server = express();
var path = require("path");
var config = require('./config');
var error = path.join(__dirname, "errors", "NotFoundError.js");
var mongoose = require('mongoose');
mongoose.set('debug', true);
  /*mongoose.set('debug', function (coll, method, query, doc) {
  console.log('#########################FROM SERVER Debug: ', query);
});*/


var port = process.env.PORT || 30001;

// parse server application/x-www-form-urlencoded
//body parser to use for POST request
server.use(morgan('dev'));
server.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Headers", "Origin, x-access-token, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  next();
});

//server.set('superSecret', config.secret);
//server.use(bodyParser.urlencoded({extended: false}));
server.use(cookieParser());
server.use(bodyParser.json());
server.use(bodyParser.json({limit: '50mb'}));
server.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

//var options = {
//  db:'foodmonger',
//  server:'localhost',
//  user:'wasiq',
//  password:'123'
//
//}
// Set db connection
mongoose.connect(config.dataConnections.database);
mongoose.connection.on('error', function (err) {
  console.log(chalk.red('Error: Could not connect to MongoDB. Did you forget to run `mongod`?'));
});



//#############################################################
//##################### Start Server   #######################
//#############################################################
  server.listen(port);
  console.log(chalk.bgGreen('listening at: ',port));

require('./router')(server);











