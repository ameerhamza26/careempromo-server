/**
 * Controller for handling all the user functionality
 * @class user
 */


var Consumers = require('../models/consumer');
var Sessions = require('../models/session');
var Utils = require('../Utils');
var helpers = require('../helpers/helpers');
var Category = require('../models/consumer_category');
var Questions = require('../models/survey.js');
var consumerLocation = require('../models/consumer_location_history');
var validate = require("validate.js");
var config = require('../config');
var _ = require('lodash');
//var gcloud = require('gcloud')(config.googleCloud);
var async = require('async');
var crypto = require('crypto');

/**
 * User Login Process flow
 * @method login
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */

var login = exports.login = function(req, res) {
//TODO: validation in password
    var platform = req.body.platform;
    var platform_version = req.body.platform_version;
    var model = req.body.model;
    var userData;

    var email = req.body.email;
    var pwd = Utils.hashPassword(_.toString(req.body.password));

    Consumers.find({ email: email, password: pwd }, function(err, result) {
        if (result.length == 0) {
            res.status(400).send({
                meta: {
                    status: 400,
                    message: 'Username/Email and password do not match to any account'
                }
            })
        } else if (result.length > 0) {
            userData = result[0];

            return helpers.getMediaObject(result[0].profile_image_id, '*')
                .then(function(data) {
                    userData.media = data;

                }).then(function() {

                    var userId = result[0]._id;
                    var token = Utils.generateToken(result[0]._id);
                    delete userData.profile_image_id;
                    delete userData.password;

                    Sessions.find({ consumer_id: userId, status: 'ACTIVE' }, function(err, result) {
                        if (err)
                            throw err;
                        //if (result.length == 0) {
                        var sessionObj = {
                            token: token,
                            consumer_id: userId,
                            platform: platform,
                            platform_version: platform_version,
                            model: model,
                            status: 'ACTIVE'
                        }

                        var session = new Sessions(sessionObj);
                        session.save(sessionObj, function(err, result) {
                            if (err) {
                                throw err;
                            } else {
                                res.status(200).send({
                                    meta: { status: 200, message: 'success' },
                                    data: { auth: { token: result.token, user: userData } }
                                })

                            }

                        })


                        //}
                        //else {
                        //    helpers.getUserStats(userData._id)
                        //       .then(function (userStats) {
                        //            userData.stats = userStats;
                        //            res.status(200).send({
                        //                meta: {status: 200, message: 'success (re-login)'},
                        //                data: {auth: {token: result[0].token, user: userData}}
                        //            })
                        //        })

                        //}
                    })
                })
        } else {
            res.status(400).send({ meta: { status: 400, message: 'User Not Found' } });
        }

    }).lean(true);

}

exports.register_old = function(req, res) {
    console.log("FACEBOOK ID ", req.body.fb_id)
    var user = {};
    var email = req.body.email;
    if (req.query.register == "facebook") {

        user = Consumers({
            name: req.body.name,
            email: req.body.email || 'null',
            fb_login: req.body.facebook
        });

    } else {

        user = Consumers({
            password: Utils.hashPassword(req.body.password),
            email: req.body.email || 'null',
            name: req.body.name,
            profile_image_id: req.body.profile_image_id
        });

    }

    var queryObj = { $or: [{ 'fb_login.id': req.body.fb_id || null }, { 'email': email }] }
    helpers.getCollection(Consumers, queryObj, { email: 1 }, {})
        .then(function(data) {
            console.log("FIND USER", data);
            if (data.length > 0) {
                res.status(400).send({ meta: { status: 400, message: 'User and Email already exist' } });
            }

            return data;

        }).then(function(userdata) {
            if (userdata.length == 0) {
                console.log("SECOND PHASE")
                helpers.insertCollection(user)
                    .then(function(data) {
                        if (data == null) {
                            res.status(400).send({ meta: { status: 400, message: 'Error' }, data: "Email Already exist" });
                        } else {
                            // Utils.sendEmail(req.body.email);
                            res.status(200).send({ meta: { status: 200, message: 'Success' }, data: data });
                        }
                    })

            }

        })

}


/**
 * User Registration Process flow
 * @method register
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */

exports.register = function(req, res) {

    var constraints = {
        "body": {
            presence: true
        },
        "body.email": {
            presence: true
        },
        "body.password": {
            presence: true,
            length: {
                minimum: 6,
                message: "must be at least 6 characters"
            }
        },
        "body.name": {
            presence: true
        }
    };

    validate.async(req, constraints).then(success, error);

    function success() {
        var user = {};
        var userLocation = {};


        user = Consumers({
            password: Utils.hashPassword(req.body.password),
            email: req.body.email || 'null',
            name: req.body.name,
            profile_image_id: req.body.profile_image_id,
            home_location: req.body.location || null,
            mobile_no: req.body.mobile_no,
            date_of_birth: req.body.date_of_birth,
            gender:req.body.gender,
            brand : req.body.brand,
            customer: req.body.customer
        });


        var queryObj = { 'email': req.body.email };
        helpers.getCollection(Consumers, queryObj, { email: 1 }, {})
            .then(function(data) {
                if (data.length > 0) {
                    res.status(400).send({ meta: { status: 400, message: 'Email already exist' } });
                }

                return data;

            }).then(function(userdata) {
                if (userdata.length == 0) {
                    helpers.insertCollection(user)
                        .then(function(data) {
                            if (data == null) {
                                res.status(400).send({
                                    meta: { status: 400, message: 'Error' },
                                    data: "Email Already exist"
                                });
                            } else {
                                // Utils.sendEmail(req.body.email);
                                res.status(200).send({ meta: { status: 200, message: 'Success' }, data: data });
                            }
                        })
                }

            })


    }

    function error(errors) {
        if (errors instanceof Error) {
            // This means an exception was thrown from a validator
            res.send(401, { meta: { status: 401, message: 'An error ocuured in validator' }, errors: errors });

        } else {
            var errorCodes = [];
            if (typeof errors['body.email'] != 'undefined')
                errorCodes.push({ code: 1001, message: 'Required Email' });
            if (typeof errors['body.password'] != 'undefined')
                errorCodes.push({ code: 1002, message: 'Password must be atleast 6 characters long' });
            if (typeof errors['body.name'] != 'undefined')
                errorCodes.push({ code: 1003, message: 'Required Name' });

            res.send(401, { meta: { status: 401, message: 'validation errors' }, errors: errorCodes });

        }

    }


}


exports.checkFacebookUser = function(req, res) {
    console.log("CHECK FACEBOOK USER");

    var queryObj = { $or: [{ 'fb_login.id':_.toString(req.params.id) }, { 'email': req.body.email }] }
    helpers.getCollection(Consumers, queryObj, {email: 1}, {})
        .then(function(data) {
            console.log("FIND DATA", data)
            if (data.length > 0) {
                res.status(200).send({ meta: { status: 200, message: 'Success' }, data: data });
            } else {
                res.status(401).send({ meta: { status: 401, message: 'Error' }, data: data });
            }
        })
}

/**
 * Facebook Registration Process flow
 * @method register
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */

exports.registerFacebook = function(req, res) {
    console.log("FACEBOOK START");
    var setObject = {};
    var user = {};



    user = Consumers({
        name: req.body.name,
        email: req.body.email || null,
        fb_login: req.body.facebook,
        home_location: req.body.location || null,
        mobile_no: req.body.mobile_no,
        date_of_birth : req.body.date_of_birth

    });

    var queryObj = { $or: [{ 'fb_login.id': _.toString(req.body.facebook.id) }, { 'email': req.body.email }] }
    helpers.getCollection(Consumers, queryObj, {}, {})
        .then(function(data) {
            console.log("FIND DATA", data)
            if (data.length > 0) {
                if (data[0].email == req.body.email) {
                    setObject = { 'fb_login.id': _.toString(req.body.facebook.id) };
                } else if (data[0].fb_login.id == _.toString(req.body.facebook.id) && (req.body.email != null && req.body.email.length > 0)) {
                    setObject = { 'email': req.body.email }
                }
                helpers.updateCollection(Consumers, queryObj, setObject)
                    .then(function(data) {
                        res.status(200).send({ meta: { status: 200, message: 'Success' }, data: data });
                    });
                return data;
            } else {
                return data;
            }

        }).then(function(userdata) {

            if (userdata.length == 0) {
                helpers.insertCollection(user)
                    .then(function(data) {
                        if (data == null) {
                            res.status(400).send({ meta: { status: 400, message: 'Error' }, data: "Email Already exist" });
                        } else {
                            // Utils.sendEmail(req.body.email);
                            res.status(200).send({ meta: { status: 200, message: 'Success' }, data: data });
                        }
                    })
            }


        })
}


/**
 * Logout Process flow
 * @method logout
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */

exports.logout = function(req, res) {

    helpers.ensureAuthentication(req)
        .then(function(sessionUser) {
            // console.log(sessionUser);
            if (sessionUser != null && sessionUser.user._id != null) {
                Sessions.remove({ consumer_id: sessionUser.user._id, token: req.headers['x-access-token'] }, function(err) {
                    console.log("rrr", err);
                    if (err)
                        throw err;
                    res.status(200).send({ meta: { status: 200, message: 'Logout successful' } });
                })
            } else {
                res.status(401).send({ meta: { status: 401, message: 'user is not logged or invalid token' } });
            }

        }).catch(function(err) {
            if (err == "invalid token") {
                res.status(500).send({ meta: { status: 500, message: err } });
            } else {
                res.status(500).send({ meta: { status: 500, message: 'Internal Server Error' } });
            }
        });

}

/**
 *  A Survey process api that update category ,radius and questions results
 * @method updateCategory
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */

exports.updateCategory = function(req, res) {

    helpers.ensureAuthentication(req)
        .then(function(sessionUser) {
            if (sessionUser.user._id != null) {
                var queryObj = { _id: sessionUser.user._id };
                var category = req.body.category;

                var setObject = { $set: { 'on_boarding': 1, category: category } }
                helpers.updateCollection(Consumers, queryObj, setObject)
                    .then(function(result) {
                        res.status(200).send({ meta: { status: 200, message: 'Success' } , data:result });
                    })


            } else {
                res.status(401).send({ meta: { status: 401, message: 'user is not logged or invalid token' } });
            }
        })

}

/**
 *  An User Update profile api that updates profile Image , Email , Home Location , Mobile Number and Date of Birth
 * @method updateProfile
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */

exports.updateProfile = function(req, res) {

    var final = {};
    helpers.ensureAuthentication(req)
        .then(function(sessionUser) {
            if (sessionUser.user._id != null) {

                //var pwd = Utils.hashPassword(req.body.pass);
                var queryObj = { '_id': sessionUser.user._id };

                helpers.getCollection(Consumers, queryObj, { password: 1 }, {})
                    .then(function(data) {
                        if (data[0] != null) {

                            var userUpdate = {
                                profile_image_id: req.body.profile_image_id || sessionUser.user.profile_image_id,
                                date_of_birth: req.body.date_of_birth,
                                email: req.body.email || sessionUser.user.email,
                                home_location: req.body.home_location || sessionUser.user.home_location,
                                mobile_no: req.body.mobile_no || sessionUser.user.mobile_no,
                                name: req.body.name || sessionUser.user.name,
                                country_code: req.body.country_code || sessionUser.user.country_code,
                                gender:req.body.gender

                            };

                            return helpers.updateCollection(Consumers, queryObj, userUpdate)
                                .then(function(data) {
                                    final.user = data._doc;
                                    return data;
                                }).then(function(userprofile) {
                                    return helpers.getMediaObject(userprofile.profile_image_id, '*')
                                        .then(function(media) {
                                            final.user.media = media;
                                            res.status(200).send({ meta: { status: 200, message: 'Success' }, data: final });
                                        })
                                })

                        } else {
                            res.status(401).send({ meta: { status: 401, message: 'Password is incorrect please try again' } });
                        }
                    })

            } else {
                res.status(401).send({ meta: { status: 401, message: 'user is not logged or invalid token' } });
            }
        }).catch(function(err) {
            console.log("ERRRR", err);
            if (err == "invalid token") {
                res.status(500).send({ meta: { status: 500, message: err } });
            } else {
                res.status(500).send({ meta: { status: 500, message: 'Internal Server Error' } });
            }
        });
}


/**
 *  Get all Post of a specific user
 * @method getAllPost
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */


exports.getAllPost = function(req, res) {

    helpers.ensureAuthentication(req)
        .then(function(sessionUser) {
            if (sessionUser.user._id != null) {

                var statsObj = { "limit": +req.query.limit, skip: +req.query.offset, sortBy: { "created": 'desc' } };
                var queryObj = { "consumer_id": req.params.id };
                helpers.getAllFeed(statsObj, queryObj)
                    .then(function(data) {
                        if (data.length > 0) {
                            res.status(200).send({ meta: { status: 200, message: 'Success' }, data: data });
                        } else {
                            res.status(200).send({ meta: { status: 200, message: 'No User Post Found' }, data: data });
                        }

                    })


            } else {
                res.status(401).send({ meta: { status: 401, message: 'user is not logged or invalid token' } });
            }
        })

}

/**
 * POST /auth/facebook
 * Sign in with Facebook
 */
exports.authFacebook = function(req, res) {
    var profileFields = ['id', 'name', 'email', 'gender', 'location'];
    var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';
    var graphApiUrl = 'https://graph.facebook.com/v2.5/me?fields=' + profileFields.join(',');

    var params = {
        code: req.body.code,
        client_id: req.body.clientId,
        client_secret: process.env.FACEBOOK_SECRET,
        redirect_uri: req.body.redirectUri
    };

    // Step 1. Exchange authorization code for access token.
    request.get({ url: accessTokenUrl, qs: params, json: true }, function(err, response, accessToken) {
        if (accessToken.error) {
            return res.status(500).send({ msg: accessToken.error.message });
        }

        // Step 2. Retrieve user's profile information.
        request.get({ url: graphApiUrl, qs: accessToken, json: true }, function(err, response, profile) {
            if (profile.error) {
                return res.status(500).send({ msg: profile.error.message });
            }

            // Step 3a. Link accounts if user is authenticated.
            if (req.isAuthenticated()) {
                User.findOne({ facebook: profile.id }, function(err, user) {
                    if (user) {
                        return res.status(409).send({ msg: 'There is already an existing account linked with Facebook that belongs to you.' });
                    }
                    user = req.user;
                    user.name = user.name || profile.name;
                    user.gender = user.gender || profile.gender;
                    user.picture = user.picture || 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
                    user.facebook = profile.id;
                    user.save(function() {
                        res.send({ token: generateToken(user), user: user });
                    });
                });
            } else {
                // Step 3b. Create a new user account or return an existing one.
                User.findOne({ facebook: profile.id }, function(err, user) {
                    if (user) {
                        return res.send({ token: generateToken(user), user: user });
                    }
                    User.findOne({ email: profile.email }, function(err, user) {
                        if (user) {
                            return res.status(400).send({ msg: user.email + ' is already associated with another account.' })
                        }
                        user = new User({
                            name: profile.name,
                            email: profile.email,
                            gender: profile.gender,
                            location: profile.location && profile.location.name,
                            picture: 'https://graph.facebook.com/' + profile.id + '/picture?type=large',
                            facebook: profile.id
                        });
                        user.save(function(err) {
                            return res.send({ token: generateToken(user), user: user });
                        });
                    });
                });
            }
        });
    });
};

exports.authFacebookCallback = function(req, res) {
    res.send('Loading...');
};

exports.locationUpdate = function(req, res) {


    helpers.ensureAuthentication(req)
        .then(function(sessionUser) {
            if (sessionUser.user._id != null) {

                var userlocation = {};
                userlocation.date = Utils.getUnixTimeStamp();
                userlocation.location = req.body.location || null;
                userlocation.location_name = req.body.location_name || null;
                var options = { safe: true, upsert: true };
                var queryObj = { consumer_id: sessionUser.user._id };

                helpers.updateCollectionViaPushKey(consumerLocation, { location_history: userlocation }, options, queryObj,
                    function(err, updateResult) {
                        if (err == null) {
                            res.status(200).send({ meta: { status: 200, message: 'Success' } });

                        } else {
                            console.log("Error", err);
                        }
                        return;
                    });

            } else {
                res.status(401).send({ meta: { status: 401, message: 'user is not logged or invalid token' } });
            }
        })
}


/**
 * Insert a user current or home location in User Schema
 * @method insertLocation
 * @param {Object} req
 * @param {Object} res
 * @return {Object} response
 */

exports.insertLocation = function(req, res) {

    helpers.ensureAuthentication(req)
        .then(function(sessionUser) {

            if (sessionUser.user._id != null) {

                var setObject = {};

                var userLocation = {};
                userLocation.date = Utils.getUnixTimeStamp();
                userLocation.location = req.body.location || null;
                userLocation.location_name = req.body.location_name || null;

                if (req.query.loc == "current_location") {
                    setObject = { $set: { 'location': userLocation } };

                } else if (req.query.loc == "home_location") {
                    setObject = { $set: { 'home_location': userLocation } };
                }

                var condition = { _id: sessionUser.user._id };
                // setObject = {$set: {'location': userlocation}};

                helpers.updateCollection(Consumers, condition, setObject)
                    .then(function(data) {
                        return data;
                    }).then(function() {

                        if (req.query.loc == "home_location") {
                            throw new Error('not maintain history')
                        }

                        var options = { safe: true, upsert: true };
                        var queryObj = { consumer_id: sessionUser.user._id };

                        helpers.updateCollectionViaPushKey(consumerLocation, { location_history: userLocation }, options, queryObj,
                            function(err, updateResult) {
                                if (err == null) {
                                    res.status(200).send({ meta: { status: 200, message: 'Success' } });

                                } else {
                                    console.log("Error", err);
                                }
                                return;
                            });

                    }).catch(function(err) {
                        res.status(200).send({ meta: { status: 200, message: 'Success' } });
                    })

            } else {
                res.status(401).send({ meta: { status: 401, message: 'user is not logged or invalid token' } });
            }
        }).catch(function(err) {
            if (err == "invalid token") {
                res.status(500).send({ meta: { status: 500, message: err } });
            } else {
                res.status(500).send({ meta: { status: 500, message: 'Internal Server Error' } });
            }
        });
}

exports.verifytoken = function(req, res) {
    async.waterfall([
        function(done) {
            Consumers.findOne({
                resetPasswordToken: req.body.token,
                resetPasswordExpires: { $gt: Date.now() }
            }, function(err, user) {
                if (!user) {
                    res.status(401).send({
                        meta: {
                            status: 401,
                            message: 'Password reset token is invalid or has expired.'
                        }
                    });
                    return;
                }
                user.save(function(err) {
                    res.status(200).send({ meta: { status: 200, message: 'Success', data: req.body.token } });
                });
            });
        }
    ], function(err) {
        res.status(401).send({ meta: { status: 401, message: 'Password reset token is invalid or has expired.' } });
    });
}
