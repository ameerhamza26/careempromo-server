/**
 * Controller for handling all the media functionality
 * @class media
 */

//#############################################################
//##################### Require Packages ########3#############
//#############################################################
var config = require('../config');
var helpers = require('../helpers/helpers');
var ConsumerFileUpload = require('../models/consumer_file_upload');
var fs = require('fs');
var mongoose = require('mongoose')
//var gcloud = require('gcloud')(config.googleCloud);

/**
 * Uploading a media file
 * @method upload
 * @param req
 * @return res
 */

exports.upload = function (req, res) {

    helpers.ensureAuthentication(req)
        .then(function (sessionUser) {

            if (sessionUser.type == "recognized") {


                var imageOf = req.query.imageof;
                var imageType = req.query.imagetype || null;
                var folderPath;


                if (imageOf == 'profile' && imageType == null) {
                    folderPath = config.path.uploadPath + sessionUser.user._id + '/' + config.path.profilePath;


                } else if (imageOf == 'post' && imageType == null) {
                    folderPath = config.path.uploadPath + sessionUser.user._id + '/' + config.path.postsFilePath;
                }
                //Attaching ImageFile
                helpers.isFileAttached(req, res, folderPath)
                    .then(function (dataResponse) {
                        if (dataResponse == 'no file attached' || dataResponse == 'directory not exist') {
                            res.status(500).send({meta: {status: 500, message: dataResponse}})
                        }
                        else {
                            console.log("uploading Image File");
                            helpers.processOnUploadedFile(req, sessionUser.user._id, imageOf, folderPath, dataResponse.files)
                                .then(function (result) {
                                    console.log("PAKISTAN", result);
                                    if (result.id) {
                                        return helpers.getMediaObject(result.id, '*')
                                            .then(function (mediaObjData) {
                                                delayedResponse(res, 200, 'Profile image uploaded', result.id, mediaObjData, 250);
                                            });
                                    } else if (result == 'false') {
                                        res.send(401, {
                                            meta: {
                                                status: 401,
                                                message: 'Failed to upload Profile image'
                                            }
                                        });
                                    } else {
                                        res.send(500, {meta: {status: 500, message: result}});
                                    }

                                })
                        }
                    })


            }
            else {
                res.send({meta: {status: 401, message: 'user is not logged or invalid token'}});
            }

        }).catch(function (err) {
            console.log(err);
            if(err == "invalid token"){
                res.status(500).send({ meta: { status: 500, message: err } });
            }else{
                res.status(500).send({ meta: { status: 500, message: 'Unauthorized User' } });
            }
        });

}

/**
 * Get a Tags list on media file
 * @method uploadTag
 * @param req
 * @return res
 */

exports.uploadTag = function (req, res) {

    helpers.ensureAuthentication(req)
        .then(function (sessionUser) {

            if (sessionUser.type == "recognized") {


                var imageOf = req.query.imageof;
                var imageType = req.query.imagetype || null;
                var folderPath;


                if (imageOf == 'profile' && imageType == null) {
                    folderPath = config.path.uploadPath + sessionUser.user._id + '/' + config.path.profilePath;


                } else if (imageOf == 'post' && imageType == null) {
                    folderPath = config.path.uploadPath + sessionUser.user._id + '/' + config.path.postsFilePath;
                }
                //Attaching ImageFile
                helpers.isFileAttached(req, res, folderPath)
                    .then(function (dataResponse) {
                        if (dataResponse == 'no file attached' || dataResponse == 'directory not exist') {
                            res.status(500).send({meta: {status: 500, message: dataResponse}})
                        }
                        else {
                            console.log("uploading Image File");
                            helpers.processOnUploadedFile(req, sessionUser.user._id, imageOf, folderPath, dataResponse.files)
                                .then(function (result) {
                                    return result.id;
                                }).then(function(fileId){
                                    // if (fileId) {
                                    //     return helpers.getMediaObject(fileId, '*')
                                    //         .then(function (mediaObjData) {
                                    //             // Get a reference to the vision component
                                    //             // var vision = gcloud.vision();
                                    //             // Make a call to the Vision API to detect the labels
                                    //             // vision.detectLabels(mediaObjData[0].medium, { verbose: true }, function (err, labels) {
                                    //             //     if (err) {
                                    //             //         console.log("ERROR IN TAG MEDIA",err);
                                    //             //     }
                                    //             //     mediaObjData.suggestedTag = labels;
                                    //             //     delayedResponse(res, 200, 'Profile image uploaded', fileId, mediaObjData, 250);
                                    //             // });
                                    //             // console.log("MEDIUM",mediaObjData[0].medium);
                                    //         })

                                    // } else 

                                    if (result == 'false') {
                                        res.send(401, {meta: {status: 401, message: 'Failed to upload Profile image'}});
                                    } else{
                                        res.send(500, {meta: {status: 500, message: result}});
                                    }
                                })
                        }
                    })


            }
            else {
                res.send({meta: {status: 401, message: 'user is not logged or invalid token'}});
            }

        });

}

/**
 * Get a Media File from server
 * @method getUploadedFiles
 * @param req
 * @return res
 */


exports.getUploadedFiles = function (req, res) {

    var id = req.params.id;
    var isThumb = req.params.isthumb || null;
    var sizeType = req.params.sizetype || null;
    var fileName = req.params.filename || null;
    var readFilePath = '';
    var fileContentType = 'image';
    if (sizeType != null) {
        sizeType = sizeType.toUpperCase();
    }
    sizeType = sizeType.toUpperCase();

    if (isThumb == 'org' && sizeType == 'ORG' && fileName != null) {
        var query = {
            _id: id,
            status: 1 // i-e status is active
        };
        return helpers.getCollection(ConsumerFileUpload, query, {}, '{}')
            .then(function (result) {
                if (result != null) {
                    //setting file path
                    readFilePath = result[0].path + fileName;
                    //fetching file
                    fs.stat(readFilePath, function (err, stat) {
                        if (err == null) {
                            console.log('File is Exist @:', readFilePath);
                            fs.readFile(readFilePath, function (err, file) {
                                if (err) {
                                    res.send({meta: {status: 401, message: 'File cannot be show'}});
                                }
                                else {
                                    //image file
                                    if (fileContentType == 'image') {
                                        res.writeHead(200, {'Content-Type': fileContentType});
                                        res.end(file);
                                        return;
                                    }

                                }
                            });

                        } else if (err.code == 'ENOENT') {
                            console.log('ENOENT: ', err.code);
                            res.send({meta: {status: 401, message: 'File does not exist'}});
                            return;

                        } else {
                            console.log('Some other error: ', err.code);
                            res.send({meta: {status: 404, message: 'Some other error'}});
                            return;
                        }
                    });
                } else {
                    res.send({meta: {status: 401, message: 'File does not exist'}});
                }
            });
    }
    else if ((isThumb == 'thumb' && sizeType == 'SMALL' && fileName != null) || (isThumb == 'thumb' && sizeType == 'MEDIUM' && fileName != null)) {

        return new Promise(function (resolveQuery) {
            var queryObj = {
                _id: mongoose.Types.ObjectId(id),
                "thumbs.sizetype": sizeType
            };
            var groupBy = {
                "_id": "$thumbs"

            };
            var projectBy = {
                _id: 1
            };

            return helpers.getAggregateCollectionUnwind(ConsumerFileUpload, "$thumbs", queryObj, groupBy, projectBy)
                .then(function (result) {
                    resolveQuery(result);
                })

        }).then(function (resultQuery) {
                if (resultQuery.length > 0) {
                    //setting file path
                    readFilePath = resultQuery[0]._id.path + fileName;
                    //fetching file
                    fs.stat(readFilePath, function (err, stat) {
                        if (err == null) {
                            console.log('File is Exist @:', readFilePath);
                            fs.readFile(readFilePath, function (err, file) {
                                if (err) {
                                    res.send({meta: {status: 401, message: 'File cannot be show'}});
                                }
                                else {

                                    res.writeHead(200, {'Content-Type': fileContentType});
                                    res.end(file);
                                    return;
                                }
                            });
                        } else if (err.code == 'ENOENT') {
                            console.log('ENOENT: ', err.code);
                            //fs.writeFile('log.txt', 'Some log\n');
                            res.send({meta: {status: 401, message: 'File does not exist'}});
                            return;
                        } else {
                            console.log('Some other error: ', err.code);
                            res.send({meta: {status: 404, message: 'Some other error'}});
                            return;
                        }
                    });
                } else {
                    res.send({meta: {status: 401, message: 'File does not exist'}});
                }

            })


    }

}

var delayedResponse = function (res, metaStatus, metaMessage, dataId, dataObj, timeout) {
    var timeout = timeout || 0;
    setTimeout(function () {
        res.send(metaStatus, {
            meta: {status: metaStatus, message: metaMessage},
            data: {
                fileId: dataId,
                file: dataObj
            }
        })
    }, timeout)
}