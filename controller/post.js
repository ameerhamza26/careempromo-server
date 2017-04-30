/**
* Controller for handling all the Post functionality
* @class Post
*/


//#############################################################
//##################### Require Packages ########3#############
//#############################################################
var consumerPost = require('../models/consumer_post');
var validate = require("validate.js");
var consumer = require('../models/consumer.js');
var consumerFileUpload = require('../models/consumer_file_upload');
var helpers = require('../helpers/helpers');
var report  = require('../models/post_report');
var Utils = require('../Utils');
var _ = require('lodash');
var mongoose = require('mongoose');
//COMMENT SCHEMA
var Schema = mongoose.Schema;
var Comments = new Schema({
    text: String,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'Consumers'},
    created: {type: Number}
});
var newComments = mongoose.model('Comments', Comments);
var config = require('../config');
var fs = require('fs');
var imageInfo = require('imageinfo');


/**
 * Post Create Process flow
 * @method create
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */

exports.create = function (req, res) {

    //######################### Validations (Rules) #########################
    var constraints = {
        "body": {
            presence: true
        },
        // "body.price": {
        //     presence: false,
        //     numericality: {
        //         onlyInteger: false // changed by Ahmer Saeed 13-Oct-2016
        //     }
        // },
        "body.category": {
            presence: true
        },
        "body.location": {
            presence: true
        }
        // ,
        // "body.post_image_id": {
        //     presence: true
        // }

    };

    validate.async(req, constraints).then(success, error);

    function success() {

        var finalPost = {};
        helpers.ensureAuthentication(req)
            .then(function (sessionUser) {
                if (sessionUser.user._id != null) {

                    var post = consumerPost({
                        price: req.body.price,
                        consumer_id: sessionUser.user._id,
                        remark: req.body.remark,
                        location: req.body.location,
                        category: req.body.category,
                        post_image_id: req.body.post_image_id,
                        location_name: req.body.location_name,
                        tag: req.body.tag,
                        createdTimeStamp: Utils.getUnixTimeStamp(),
                        place: req.body.place

                    });
                    helpers.insertCollection(post)
                        .then(function (post) {
                            finalPost.post = post;
                            return post;

                        }).then(function (post) {
                            helpers.renderPost(post._id)
                                .then(function (data) {
                                    finalPost.media = data;
                                    res.status(200).send({meta: {status: 200, message: 'Success'}, data: data});
                                    helpers.stats(sessionUser.user._id)

                                })
                        })

                } else {
                    res.send({meta: {status: 401, message: 'user is not logged or invalid token'}});
                }

            }).catch(function (err) {
                if (err == "invalid token") {
                    res.status(500).send({meta: {status: 500, message: err}});
                } else {
                    res.status(500).send({meta: {status: 500, message: 'Unauthorized User'}});
                }
            });
    }


    function error(errors) {
        if (errors instanceof Error) {
            // This means an exception was thrown from a validator
            res.send(401, {meta: {status: 401, message: 'An error occurred in validator'}, errors: errors});
        } else {
            res.send(401, {meta: {status: 401, message: 'validation errors'}, errors: errors});
        }
    }
}


/**
 * Get All Feeds (Post) through default criteria
 * @method getAllFeeds
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */


exports._getAllFeeds = function (req, res) {
    console.log("START SIMPLE FEEDS")
    var finalData = [];
    var statsObj = '{}';
    var queryObj = {};
    var location = {};
    var radius;
    var category;
    helpers.ensureAuthentication(req)
        .then(function (sessionUser) {

            if (sessionUser.user._id != null) {

                console.log("LIMIT HO", req.query.limit);
                console.log("OFFSET HO", req.query.offset);

                if (req.query.loc == "current_location" && sessionUser.user.location.location != null) {

                    console.log("CURRENT LOCATION");
                    if(req.query.lat == null && req.query.long== null){

                        radius = req.query.r || sessionUser.user.radius;
                        category = req.query.category || sessionUser.user.category;
                        console.log("CATEGORY", category);
                        console.log("RADIUS", radius);
                        queryObj = {
                            'location': {$near: sessionUser.user.location.location, $maxDistance: radius / 111.12},
                            'category': {$in: category}
                        };

                    }
                    else{
                        console.log("CURRENT LOCATION WITH SPECIFIC MULTIPLE LOCATION");
                        var x = JSON.parse(req.query.lat);
                        var y = JSON.parse(req.query.long);
                        queryObj = {'location': [x,y] };
                    }

                    statsObj = {
                        "limit": +req.query.limit,
                        skip: +req.query.offset,
                        sortBy: {"location": 'desc', "created": 'desc'}
                    };
                    location.type = "current_location";
                    location.location = sessionUser.user.location.location;

                } else if (req.query.loc == "home_location" && sessionUser.user.home_location.location != null) {

                    console.log("HOME LOCATION");

                    if(req.query.lat == null && req.query.long== null) {

                        radius = req.query.r || sessionUser.user.radius;
                        category = req.query.category || sessionUser.user.category;
                        console.log("CATEGORY", category);
                        console.log("RADIUS", radius);
                        queryObj = {
                            'location': {
                                $near: sessionUser.user.home_location.location,
                                $maxDistance: radius / 111.12
                            }, 'category': {$in: category}
                        };

                    } else{
                        console.log("HOME LOCATION WITH SPECIFIC MULTIPLE LOCATION");
                        var x = JSON.parse(req.query.lat);
                        var y = JSON.parse(req.query.long);
                        queryObj = {'location': [x,y] };
                    }
                    statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: {"location": 'desc', "created": 'desc'}};
                    location.type = "home_location";
                    location.location = sessionUser.user.home_location.location;

                }
                //else if (req.query.price == "price" && sessionUser.user.location.location != null ) {
                //     console.log("PRICE HO");
                //     var price = req.query.p;
                //     queryObj = {'location': {$near: sessionUser.user.location.location}, 'price': {$lte: price}};
                //     statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: {"location": 'desc'}};
                // }
                else {
                    statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: {"created": 'desc'}};
                    location.location = sessionUser.user.location.location;
                }

                helpers.getAllFeed(statsObj, queryObj)
                    .then(function (result) {
                        var uids = [];
                        for (var i = 0; i < result.length; i++) {
                            uids.push(result[i].data.consumer_id)
                            finalData.push({feed: result[i].data})

                        }
                        return uids;
                    })
                    .then(function (uids) {
                        helpers.getFeedUser(uids)
                            .then(function (finalUsers) {
                                _.forEach(finalData, function (value, key) {
                                    _.forEach(finalUsers, function (val, k) {
                                        if (value.feed.consumer_id.toString() == val.id.toString()) {
                                            finalData[key].user = finalUsers[k];
                                            finalData[key].location = location;

                                        }
                                    })
                                })
                                res.status(200).send({meta: {status: 200, message: 'Success'}, data: finalData});
                            });
                    })

            } else {
                res.send({meta: {status: 401, message: 'user is not logged or invalid token'}});
            }
        }).catch(function (err) {
            console.log("NEW ERROR", err);
            if (err == "invalid token") {
                res.status(500).send({meta: {status: 500, message: err}});
            } else {
                res.status(500).send({meta: {status: 500, message: 'Internal Server Error'}});
            }
        });
}

exports.getAllFeeds = function (req, res) {
    console.log("START SIMPLE FEEDS")
    console.log("LIMIT HO", req.query.limit);
    console.log("OFFSET HO", req.query.offset);
    console.log("CATEGORY", _.toString(req.query.cat));


    var finalData = [];
    var statsObj = {};
    var queryObj = {};
    var location = {};
    var radius;
    var category;
    var categoryType = req.query.cat || "ALL-CATEGORY" ;
    console.log("CATEGORY TYPE", categoryType);

    helpers.ensureAuthentication(req)
        .then(function (sessionUser) {
            console.log("Session User",sessionUser);
            if (sessionUser.user._id != null) {

                if(categoryType != "MY-CATEGORY"){

                     console.log("ALL-CATEGORY");
                    if (req.query.loc == "current_location" && sessionUser.user.location.location != null) {

                        console.log("CURRENT LOCATION WITH RESPECT TO ALL CATEGORY");

                        radius = req.query.r || sessionUser.user.radius;
                        console.log("RADIUS", radius);
                        queryObj = {
                            'location':{ $geoWithin: { $centerSphere: [ sessionUser.user.location.location ,
                                radius / 3963.2 ] } }
                        };

                        statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: { "created": 'desc'}};
                        console.log("QUERY-OBJECT",queryObj);
                        console.log("STATS-OBJECT",statsObj);

                        location.type = "current_location";
                        location.location = sessionUser.user.location.location;
                        location.location_name = sessionUser.user.location.location_name




                    }else if(req.query.loc == "home_location" && sessionUser.user.home_location.location != null ){

                        console.log("HOME LOCATION WITH RESPECT TO ALL CATEGORY");

                        radius = req.query.r || sessionUser.user.radius;
                        console.log("RADIUS", radius);
                        queryObj = {
                            'location':{ $geoWithin: { $centerSphere: [ sessionUser.user.home_location.location ,
                                radius / 3963.2 ] } }
                        };
                        statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: { "created": 'desc'}};
                        console.log("QUERY-OBJECT",queryObj);
                        console.log("STATS-OBJECT",statsObj);

                        location.type = "home_location";
                        location.location = sessionUser.user.home_location.location;
                        location.location_name = sessionUser.user.home_location.location_name;

                    } else if(req.query.lat != null && req.query.long != null){
                        console.log("SPECIFIC LOCATION");
                        var x = JSON.parse(req.query.lat);
                        var y = JSON.parse(req.query.long);
                        queryObj = {'location': [x,y] };
                        statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: { "created": 'desc'}};
			   location.type = "current_location";
                        location.location = sessionUser.user.location.location;
                        location.location_name = sessionUser.user.location.location_name


                    }
                    else{
                        console.log("ALL CATEGORY WITH NO LOCATION AVAILABLE",queryObj);
                        statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: { "created": 'desc'}};
                    }

                }else{

                    console.log("MY-CATEGORY");

                    if (req.query.loc == "current_location" && sessionUser.user.location.location != null) {

                        console.log("CURRENT LOCATION WITH RESPECT TO MY CATEGORY");

                        radius = req.query.r || sessionUser.user.radius;
                        category =  sessionUser.user.category;
                        console.log("RADIUS", radius);
                        console.log("CATEGORY", category);
                        queryObj = {
                            'location':{ $geoWithin: { $centerSphere: [ sessionUser.user.location.location ,
                                radius / 3963.2 ] }  } , 'category': {$in: category}
                        };
                        statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: { "created": 'desc'}};
                        console.log("QUERY-OBJECT",queryObj);
                        console.log("STATS-OBJECT",statsObj);

                        location.type = "current_location";
                        location.location = sessionUser.user.location.location;
                        location.location_name = sessionUser.user.location.location_name;



                    }else if(req.query.loc == "home_location" && sessionUser.user.home_location.location != null ){

                        console.log("HOME LOCATION WITH RESPECT TO MY CATEGORY");

                        radius = req.query.r || sessionUser.user.radius;
                        category =  sessionUser.user.category;
                        console.log("RADIUS", radius);
                        console.log("CATEGORY", category);
                        queryObj = {
                            'location':{ $geoWithin: { $centerSphere: [ sessionUser.user.home_location.location ,
                                radius / 3963.2 ] }  } , 'category': {$in: category}
                        };
                        statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: {"created": 'desc'}};
                        console.log("QUERY-OBJECT",queryObj);
                        console.log("STATS-OBJECT",statsObj);

                        location.type = "home_location";
                        location.location = sessionUser.user.home_location.location;
                        location.location_name = sessionUser.user.home_location.location_name;
                    }
                    else{
                        console.log("ALL CATEGORY WITH NO LOCATION AVAILABLE",queryObj);
                        statsObj = {"limit": +req.query.limit, skip: +req.query.offset, sortBy: {"created": 'desc'}};

                        location.type = "current_location";
                        location.location = sessionUser.user.location.location;
                        location.location_name = sessionUser.user.location.location_name;
                    }

                }
                
                helpers.getAllFeed(statsObj, queryObj)
                    .then(function (result) {
                        var uids = [];
                        for (var i = 0; i < result.length; i++) {
                            uids.push(result[i].data.consumer_id);
                            finalData.push({feed: result[i].data})

                        }
                        return uids;
                    })
                    .then(function (uids) {
                        helpers.getFeedUser(uids)
                            .then(function (finalUsers) {
                                _.forEach(finalData, function (value, key) {
                                    _.forEach(finalUsers, function (val, k) {
                                        if (value.feed.consumer_id.toString() == val.id.toString()) {
                                            finalData[key].user = finalUsers[k];
                                            finalData[key].location = location;

                                        }
                                    })
                                })
                                res.status(200).send({meta: {status: 200, message: 'Success'}, data: finalData});
                            });
                    })


            } else {
                res.send({meta: {status: 401, message: 'user is not logged or invalid token'}});
            }
        }).catch(function (err) {
            console.log("NEW ERROR", err);
            if (err == "invalid token") {
                res.status(500).send({meta: {status: 500, message: err}});
            } else {
                res.status(500).send({meta: {status: 500, message: 'Internal Server Error'}});
            }
        });
}


