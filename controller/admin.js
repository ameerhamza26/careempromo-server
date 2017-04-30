/**
 * Created by Wasiq on 8/25/2016.
 */

var Category = require('../models/consumer_category');
var Questions = require('../models/survey.js');
var helpers = require('../helpers/helpers');
var Utils = require('../Utils');
var _ = require('lodash');

exports.getCategories = function(req, res) {
    /*helpers.ensureAuthentication(req)
     .then(function (sessionUser) {
     console.log(sessionUser);
     if (sessionUser != null && sessionUser.user._id != null) {*/

    var statsObj = { sortBy: { "category_name": 1 } };
    var requiredObj = { "category_name": 1, "_id": 1 };
    var otherObj;
    helpers.getCollection(Category, {}, requiredObj, statsObj)
        .then(function(category) {

            _.each(category, function(value, key) {
                if (value.category_name == 'Others') {
                    otherObj = value;
                }
            })

            _.pullAllBy(category, [{ 'category_name': "Others" }], 'category_name');
            category.push(otherObj);
            res.status(200).send({ meta: { status: 200, message: 'Success' }, data: category });
        })

    /*  }
     else {
     res.status(401).send({meta: {status: 401, message: 'user is not logged or invalid token'}});
     }

     })*/


}