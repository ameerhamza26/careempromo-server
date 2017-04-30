/**
 * Main Usable Functions for handling
 * @class helper
 */


//#############################################################
//##################### Require Packages ########3#############
//#############################################################
var Promise = require("bluebird");
var config = require('../config');
var Sessions = require('../models/session');
var fsExtra = require('fs-extra');
var fs = require('fs');
var multer = require('multer');
var chalk = require('chalk');
var gm = require('gm');
var imageInfo = require('imageinfo');
var Utils = require('../Utils');
var mkdirp = require('mkdir-promise'); // make directory using promise
var consumerFileUpload = require('../models/consumer_file_upload');
var consumer = require('../models/consumer');
var consumerPost = require('../models/consumer_post');
var _ = require('lodash');


/**
 * Returns the User Session
 * if it is exist
 * @param req
 * @return {promise}
 */

exports.ensureAuthentication = function (req) {

    var userObj = {};
    //################### Validations ###################
    if ((typeof req.headers == 'undefined' || req.headers == null) || (typeof req.headers['x-access-token'] == 'undefined' || req.headers['x-access-token'] == null)) {

        return new Promise(function (resolve) {
            resolve({consumer_id: -1, type: 'unrecognized'});
        });
    }
    else {
        return new Promise(function (resolve,reject) {
            //################### Code ###################
            var token = req.body.token || req.query.token || req.headers['x-access-token'];
            // decode token
            return Sessions.findOne({token: token})
                .populate('consumer_id')
                .exec(function (err, user) {
                    if (err) {
                        throw err
                    }
                    else if (user != null) {

                        userObj.user = user.consumer_id._doc;
                        userObj.type = 'recognized';
                        delete userObj.user.password;
                        resolve(userObj)

                    } else {
                        reject('invalid token');
                    }
                })
        }).then(function(data){
                return data;
            })

    }

}

exports.getPopulatedCollections = function (collectionName, queryObj, joinObj) {
    return new Promise(function (firstPromiseResolve) {
        collectionName.find(queryObj)
            .populate({
                path: joinObj.referenceId
            })
            //.limit(statsObj.limit)
            //.sort(statsObj.sortBy)
            .exec(function (err, populatedResult) {
                if (err) {
                    // console.log(chalk.red(' ======= Error in Populating Collections =======', err));
                    console.log("populate-error", err);
                    firstPromiseResolve(err);
                } else {
                    // console.log(chalk.green(' ======= Hence Collections are Successfully Populated  ======='));
                    console.log("SSSSSSSSSS", populatedResult);
                    firstPromiseResolve(populatedResult);
                }
            });
    })
        .then(function (resultFirstPromise) {
            return resultFirstPromise;
        });
};


/**
 * Parse and Upload the File Request
 * only if it is attached
 * @method isFileAttached
 * @param req
 * @param folderPath
 * @return {promise}
 */

exports.isFileAttached = function (req, res, folderPath) {

    return new Promise(function (promiseResolve) {

        return fsExtra.ensureDir(folderPath, function (err) {
            if (err) {
                promiseResolve('directory not exist');
            }
            else {
                var storage = multer.diskStorage({
                    destination: function (req, file, callback) {
                        callback(null, folderPath);
                    },
                    filename: function (req, file, callback) {
                        callback(null, file.fieldname + '-' + Date.now() + ".jpg");
                    }
                });

                var upload = multer({storage: storage}).single('uploadfile');
                upload(req, res, function (err) {
                    if (req.file) {
                        var attachedFileProp = {files: req.file};
                        promiseResolve(attachedFileProp);
                    }
                    if (err) {
                        promiseResolve("no file attached");
                    }
                })

            }
        });
    })
        .then(function (promiseResult) {
            return promiseResult;
        })

};

/**
 * Process on uploaded file image
 * @method processOnUploadedFile
 * @param req
 * @param user_id
 * @param imageType
 * @param folderPath
 * @return {promise}
 */

exports.processOnUploadedFile = function (req, uId, imageType, folderPath, attachedFileProp) {

    var fileSize = [];
    var dir = [];
    var type;
    if (imageType == 'profile') {
        type = 'PROFILE';
    } else if (imageType == 'post') {
        type = 'POST';
    }
    fileSize = config.thumbSize.profile;
    dir = config.thumbDirName.profile;
    var pathLength = folderPath.length;

    return new Promise(function (resolve) {

        return uploadImageFileToDirectory(req, uId, folderPath, dir, fileSize, pathLength, type, attachedFileProp)
            .then(function (uploadResponse) {
                console.log("RESPONSE AFTER STORING ON DIRECTORY", uploadResponse)
                resolve(uploadResponse);

            })
    }).then(function (uploadResponse) {

            if (uploadResponse == 'File should be of type Image' || uploadResponse == 'Invalid file found' || uploadResponse == 'No file found' || uploadResponse == 'Error in Resizing Image') {
                return uploadResponse;
            }
            else {
                //Here uploadResponse is correct and returning fileParamsObj object
                //Creating Thumbs Directory
                console.log("STARTING THUMB CREATING PROCESS")
                return createDirectory(uploadResponse)
                    .then(function (directoryCreated) {
                        console.log("AFTER CREATING DIRECTOTY AND CROPPING ")
                        if (directoryCreated == 'true') {
                            return userFileUploadSchema(uploadResponse, imageType)
                                .then(function (data) {
                                    console.log("UPLOAD ON DATABASE", data);
                                    if (data != null) {
                                        return {id: data};
                                    } else {
                                        return false;
                                    }
                                });

                        } else {
                            return directoryCreated;
                        }
                    });
            }

        });


}


//uploads images to directory
//files parameters determines the attached file properties

/**
 * Process on uploaded Image file to directory
 * @method uploadImageFileToDirectory
 * @param req
 * @param user_id
 * @param folderPath
 * @param dir
 * @param fileSize
 * @param pathLength
 * @param type
 * @param files
 * @return {promise}
 */
var uploadImageFileToDirectory = exports.uploadImageFileToDirectory = function (req, uId, folderPath, dir, fileSize, pathLength, type, files) {

    console.log('Attached File Properties', files);

    return new Promise(function (resolve, reject) {
        var fileName;
        var fileExtension;
        var uploadedFileName;
        uploadedFileName = files.filename;
        uploadedFileName = uploadedFileName.split(".");
        fileName = uploadedFileName[0];
        fileExtension = uploadedFileName[1].toLowerCase();
        console.log(chalk.yellow('Uploaded File Name is', fileName));
        console.log(chalk.yellow('Uploaded File Extension is', fileExtension));

        var isValidFileExt = isValidFileExtension(fileExtension);
        if (isValidFileExt.validity == 'false') {
            console.log(chalk.yellow('File is not of valid Extension'));
            fs.unlinkSync(files.path);
        } else {

            console.log(chalk.yellow('File has the valid Extension'));
            console.log(chalk.yellow('File is the Image File'));
            var fileType = isValidFileExt.fileType;

            if (fileType == 'IMAGE') {

                return new Promise(function (resolveResizeImage) {
                    console.log("Image File Path", files.path)

                    //Resizing Image
                    var resizeImage = gm(files.path);
                    console.log(chalk.yellow('File is of jpg Extension'));
                    resizeImage.resize(config.imageConfig.maxCompressWidth, config.imageConfig.maxCompressHeight, '>');
                    //setting file extension to jpg now
                    fileExtension = '.jpg';
                    files.path = folderPath + fileName + fileExtension;
                    resizeImage.write(files.path, function (err) {
          //              if (err) {
        //                    console.log(chalk.yellow('Error in Resizing Image'));
      //                      resolveResizeImage('Error in Resizing Image');
    //                    } else {
  //                          console.log(chalk.yellow('Compressed / Resized successfully'));
                            //nothing to throw
                            resolveResizeImage('true');
//                        }
                    });


                }).then(function (resized) {

                        if (resized == 'true') {
                            var fileWidth = 0;
                            var fileHeight = 0;
                            var fileInfo = '';
                            var fileDataObj = {};
                            return fs.readFile(files.path, function (err, data) {
                                if (err) {
                                    resolve('No file found');
                                } else {
                                    fileInfo = imageInfo(data);
                                    fileWidth = fileInfo.width;
                                    fileHeight = fileInfo.height;
                                    fileDataObj = {
                                        files: files,
                                        fileType: fileType,
                                        fileWidth: fileWidth,
                                        fileHeight: fileHeight,
                                        fileName: fileName,
                                        fileExtension: fileExtension,
                                        fileOf: type
                                    };
                                    resolve(fileDataObj);
                                }
                            });
                        } else {
                            resolve('Error in Resizing Image');
                        }
                    });

            }
            else {
                fs.unlinkSync(files.path);
            }
        }

    }).
        then(function (uploadResult) {
            //if result value not contains fileParamsObj object then return response immediately
            if (uploadResult == 'File should be of type Image' || uploadResult == 'Invalid file found' || uploadResult == 'No file found' || uploadResult == 'Error in Resizing Image') {
                return uploadResult;
            } else {
                fileParamsObj =
                {
                    uid: uId,
                    source: folderPath,
                    destination: folderPath + 'thumb' + '/',
                    dir: dir,
                    fileOf: uploadResult.fileOf,
                    filePath: uploadResult.files.path,
                    fileName: uploadResult.fileName,
                    fileExt: uploadResult.fileExtension,
                    fileType: uploadResult.fileType,
                    width: uploadResult.fileWidth,
                    height: uploadResult.fileHeight,
                    fileSize: fileSize,
                };

                return fileParamsObj;
            }

        })


}

/**
 * Check valid file extension for uploaded file
 * @method isValidFileExtension
 * @param req
 * @param user_id
 * @param imageType
 * @param folderPath
 * @return {promise}
 */
var isValidFileExtension = exports.isValidFileExtension = function (fileExt) {

    var fileObj = {};
    var fileType = "";
    if (fileExt == 'jpg' || fileExt == 'jpeg' || fileExt == 'png' || fileExt == 'gif') {
        fileType = "IMAGE";
        return fileObj = {fileType: fileType, validity: "true"};
    }
    else {
        return fileObj = {fileType: "NONE", validity: "false"};
    }
};

var createDirectory_old = exports.createDirectory = function (fileParamsObj) {

    var mkdir = Promise.promisify(fsExtra.mkdirs);
    //fileParamsObj is an object of image properties
    var isErrorCounter = null;
    var reportError = null;
    return new Promise(function (resolveCreateDirectory) {
        var objLength = fileParamsObj.dir.length;
        console.log("LENGTH============", objLength)
        console.log("DIR============", fileParamsObj.dir)
        console.log(chalk.yellow('======== Directory to be created : ', fileParamsObj.destination));
        return mkdir(fileParamsObj.destination)
            .then(function (data) {
                var counter = 0;

                return Promise.map(fileParamsObj.dir, function (dir) {
                    console.log(chalk.yellow('======== Sub Directory created :', dir))
                    console.log(chalk.yellow('========  Counter is :', counter))
                    mkdir(fileParamsObj.destination + '/' + dir + '/');
                    var requiredThumbPath = fileParamsObj.destination + dir + '/' + fileParamsObj.fileName + fileParamsObj.fileExt;

                    //return new Promise(function(){
                    //    console.log('inner promise ', counter);
                    //    counter++;
                    //});

                    //return cropResizeImage(counter).then(function(string){
                    //    console.log(string);
                    //});

                    //calling cropResizeImage
                    return cropResizeImage(fileParamsObj, requiredThumbPath).then(function () {
                        console.log('###############This thumb is created');
                        counter++;
                        return;
                    });
                }).then(function (dir) {
                    console.log("Complete Done");
                })
            })
    })
        .then(function () {

        });
}

var cropResizeImage_old = exports.cropResizeImage = function (fileParamsObj, thumbLocation) {

    var exists = Promise.promisify(fs.exists);
    var gmP = Promise.promisify(gm);


    console.log('in cropResizeImage');
    //console.log('PAKKA Result', fileParamsObj);
    //console.log('counter Result', counter);
    return exists(fileParamsObj.filePath, function (fileExists) {
        //if image exist than crop and resize it and return true
        //other wise return false
        if (fileExists) {

            if (fileParamsObj.fileOf == 'PROFILE') {


                var cropImage = gm(fileParamsObj.filePath);
                cropImage.resize(fileParamsObj.fileSize[counter].width, fileParamsObj.fileSize[counter].height, '^');
                cropImage.gravity('Center');
                cropImage.quality(92);
                cropImage.crop(fileParamsObj.fileSize[counter].width, fileParamsObj.fileSize[counter].height);
                cropImage.write(thumbLocation, function (err) {
                    //if (err) {
                       // console.log('========= Here Error in Cropping Image =======', err);
                      //  throw new Error('Error in cropping image');
                    //} else {
                        //nothing to throw
                        console.log('=========  Image Cropped Successfully ==========');
                        return;
                    //}

                });


            }
            else if (fileParamsObj.fileOf == 'POST') {


                return Utils.postResizeRatio(fileParamsObj.width)
                    .then(function (ratioArray) {

                        if (ratioArray.length > 0) {
                            console.log('Now creating thumb Post Resize Ratio is in Range');
                            var resizeWidth = Math.floor((parseFloat(ratioArray[0])) * (fileParamsObj.width));
                            var resizeHeight = Math.floor((parseFloat(ratioArray[0])) * (fileParamsObj.height));


                            fileParamsObj.fileSize[0].width = resizeWidth;
                            fileParamsObj.fileSize[0].height = resizeHeight;
                            console.log('ponka');
                            gm(fileParamsObj.filePath)
                                .resize(resizeWidth, resizeHeight, '^')
                                .noProfile()
                                .write(fileParamsObj.destination, function (err) {
                                    /*if (err) {
                                     console.log('========= Error in Cropping Image =======');
                                     throw new Error('Error in cropping image');
                                     } else {*/
                                    //nothing to throw
                                    console.log('=========  Image Cropped Successfully ==========');
                                    return;
                                    //}
                                });

                            /*return gmP
                             .resize(resizeWidth, resizeHeight, '^')
                             .noProfile()
                             .write(fileParamsObj.destination)
                             .then(function(){

                             console.log('=========  Image Cropped Successfully ==========');
                             return;
                             })*/
                        } else {
                            console.log('Failed to Create thumb Post Resize Ratio is out of Range');
                            //throw new Error('Error in cropping image');
                            return;
                        }
                    });


            }

        } else {
            throw new Error('Error file not exist ');
        }


    }).then(function (data) {
        console.log("data", data);
    })


}


/**
 * Create the respective thumb directories only if it is not exist
 * @param {Object} uploadedFileProperties
 * @method createDirectory
 */

var createDirectory = exports.createDirectory = function (fileParamsObj) {
    //fileParamsObj is an object of image properties
    var isErrorCounter = null;
    var reportError = null;
    return new Promise(function (resolveCreateDirectory) {
        var objLength = fileParamsObj.dir.length;
        var promiseFor = Promise.method(function (condition, action, value) {
            if (!condition(value)) return value;
            return action(value).then(promiseFor.bind(null, condition, action));
        });
        console.log(chalk.yellow('======== Directory to be created : ', fileParamsObj.destination));
        return mkdirp(fileParamsObj.destination)
            .then(function (thumbDirectoryCreated) {
                console.log(chalk.yellow('======== Directory created : ', thumbDirectoryCreated));
                promiseFor(function (counter) {
                        return counter < objLength;
                    },
                    function (counter) {
                        console.log(chalk.yellow('======== Directory to be created : ', fileParamsObj.destination + '/' + fileParamsObj.dir[counter] + '/'));
                        return mkdirp(fileParamsObj.destination + '/' + fileParamsObj.dir[counter] + '/')
                            .then(function (sizeDirectoryCreated) {
                                console.log(chalk.yellow('======== Directory created : ', sizeDirectoryCreated));
                                return fileParamsObj.dir[counter];
                            })
                            .then(function (path) {
                                var requiredThumbPath = fileParamsObj.destination + path + '/' + fileParamsObj.fileName + fileParamsObj.fileExt;
                                console.log(chalk.yellow('======== Required Thumb Path : ', requiredThumbPath));
                                //calling cropResizeImage
                                return cropResizeImage(fileParamsObj, requiredThumbPath, counter)
                                    .then(function (imageModified) {
                                        if (imageModified == 'true') {
                                            isErrorCounter = objLength;
                                            return ++counter;
                                        } 
                                        else if (imageModified == 'Error in cropping image') {
                                            reportError = imageModified;
                                            isErrorCounter = parseInt(objLength) + 1;
                                            counter = objLength;
                                        } else {
                                            reportError = 'false';
                                            return 'false';
                                        }
                                    });
                            });
                    }, 0)
                    .then(function () {
                        if (isErrorCounter > objLength) {
                            resolveCreateDirectory(reportError);
                        } else if (reportError == 'false') {
                            resolveCreateDirectory('false');
                        } else {
                            resolveCreateDirectory('true');
                        }
                    });
            });
    })
        .then(function (createDirectoryResult) {
            if (createDirectoryResult == 'true') {
                return 'true';
            } else if (createDirectoryResult == 'false') {
                return 'false';
            } else {
                return createDirectoryResult;
            }
        });
}

/**
 * Croping the File
 * @method cropResizeImage
 * if it is larger than allowed width and height
 * @param {string} destinationPath
 * @returns {promise}
 */

var cropResizeImage = exports.cropResizeImage = function (fileParamsObj, thumbLocation, counter) {

    return new Promise(function (resolveImageModified) {
        console.log('in cropResizeImage');
        console.log('PAKKA Result', fileParamsObj);

        fs.exists(fileParamsObj.filePath, function (fileExists) {
            //if image exist than crop and resize it and return true
            //other wise return false
            if (fileExists) {

                if (fileParamsObj.fileOf == 'PROFILE') {


                    var cropImage = gm(fileParamsObj.filePath);
                    cropImage.resize(fileParamsObj.fileSize[counter].width, fileParamsObj.fileSize[counter].height, '^');
                    cropImage.gravity('Center');
                    cropImage.quality(92);
                    cropImage.crop(fileParamsObj.fileSize[counter].width, fileParamsObj.fileSize[counter].height);
                    counter++
                    cropImage.write(thumbLocation, function (err) {
                        //if (err) {
                           // console.log('========= Here Error in Cropping Image =======', err);
                          //  resolveImageModified('Error in cropping image');
                        //} else {
                            //nothing to throw
                            console.log('=========  Image Cropped Successfully ==========');

                            resolveImageModified('true');
                       // }

                    });


                } else if (fileParamsObj.fileOf == 'POST') {

                    var cropImage = gm(fileParamsObj.filePath);
                    cropImage.resize(fileParamsObj.fileSize[counter].width, fileParamsObj.fileSize[counter].height, '^');
                    cropImage.gravity('Center');
                    cropImage.quality(92);
                    cropImage.crop(fileParamsObj.fileSize[counter].width, fileParamsObj.fileSize[counter].height);
                    counter++
                    cropImage.write(thumbLocation, function (err) {
                        //if (err) {
                          //  console.log('========= Here Error in Cropping Image =======', err);
                           // resolveImageModified('Error in cropping image');
                        //} else {
                            //nothing to throw
                          //  console.log('=========  Image Cropped Successfully ==========');

                            resolveImageModified('true');
                        //}

                    });

                }

            } else {
                resolveImageModified('false');
            }
        })

    })
        .then(function (result) {
            return result;
        });


}

var userFileUploadSchema = exports.userFileUploadSchema = function (fileParamsObj, imageType) {


    return new Promise(function (resolvePromise) {
        var filePath;
        var thumbArray = [];

        if (fileParamsObj.fileType == 'IMAGE') {

            var objLength = 2;
            var sizeType;
            var thumbPath;
            filePath = fileParamsObj.source;

            for (var counter = 0; counter < objLength; counter++) {
                if (fileParamsObj.dir[counter] == 'small') {
                    sizeType = 'SMALL';
                    thumbPath = fileParamsObj.destination + config.path.postSmallThumb;
                } else if (fileParamsObj.dir[counter] == 'medium') {
                    sizeType = 'MEDIUM';
                    thumbPath = fileParamsObj.destination + config.path.postMediumThumb;
                }

                thumbArray.push({
                    'path': thumbPath,
                    'width': fileParamsObj.fileSize[counter].width,
                    'height': fileParamsObj.fileSize[counter].height,
                    'sizetype': sizeType,
                    'thumbtype': 'IMAGETHUMB',
                    'status': 1
                });
            }
        }

        //now saving new file in collection
        var mediaObject = {
            consumer_id: fileParamsObj.uid,
            file_name: fileParamsObj.fileName,
            extension: fileParamsObj.fileExt,
            width: fileParamsObj.width,
            path: fileParamsObj.source,
            height: fileParamsObj.height,
            image_type: fileParamsObj.fileOf,
            thumbs: thumbArray,


        }

        var consumer_file_upload = new consumerFileUpload(mediaObject);
        consumer_file_upload.save(function (err, dataObj) {
            var insertedId = null;
            if (!err) {
                insertedId = dataObj._id;
                console.log('No Error in Saving Collection', insertedId);
                resolvePromise(insertedId);
            } else {
                console.log('Error in Saving Collection');
                resolvePromise(insertedId);
            }
        });
    })
        .then(function (resultPromise) {
            return resultPromise;
        });


}


//returns the array of media used in single message
//fileId = media used in message
//thumbTypes = ['*'] for all Images Thumbs types
//thumbTypes = ['SMALL|MEDIUM|LARGE|SQUARE|ORG'] for selected Images Thumbs types

var getMediaObject_old = exports.getMediaObject_old = function (fileId, thumbTypes) {
    var media = [];
    // var baseUrl = config.baseUrl.socketFileServer;
    var uploadPath = config.path.uploadPath;
    var smallThumbParameter = config.path.postSmallThumb;
    var mediumThumbParameter = config.path.postMediumThumb;
    var query = {
        _id: fileId,
        status: 1 // i-e status is active\
    };
    return getCollection(consumerFileUpload, query, {}, {})
        .then(function (result) {
            if (result.length > 0) {
                var fileType = 'IMAGE';
                var allFiles = {};
                if (fileType == 'IMAGE') {
                    if (thumbTypes == '*') {
                        // i-e for required all types of thumbs
                        for (var i = 0; i < result[0].thumbs.length; i++) {
                            if (result[0].thumbs[i].sizetype == 'SMALL') {
                                allFiles.small = config.baseUrl.fileServer + uploadPath + result[0]._id + '/' + config.path.thumb + smallThumbParameter + result[0].file_name + result[0].extension;
                            }
                            if (result[0].thumbs[i].sizetype == 'MEDIUM') {
                                allFiles.medium = config.baseUrl.fileServer + uploadPath + result[0]._id + '/' + config.path.thumb + mediumThumbParameter + result[0].file_name + result[0].extension;
                            }
                        }
                        media.push(allFiles);
                        return media;
                    }
                    else {
                        // i -e for selected thumbs
                        if (thumbTypes != null) {
                            var thumbTypesArray = thumbTypes.split("|");
                            if (thumbTypesArray.length > 0) {
                                for (var key in thumbTypesArray) {
                                    if (thumbTypesArray[key] == 'SQUARE') {
                                        allFiles.square = baseUrl + uploadPath + result[0]._id + '/' + squareThumbParameter + result[0].name + result[0].extension;
                                    }
                                    if (thumbTypesArray[key] == 'SMALL') {
                                        allFiles.small = baseUrl + uploadPath + result[0]._id + '/' + smallThumbParameter + result[0].name + result[0].extension;
                                    }
                                    if (thumbTypesArray[key] == 'MEDIUM') {
                                        allFiles.medium = baseUrl + uploadPath + result[0]._id + '/' + mediumThumbParameter + result[0].name + result[0].extension;
                                    }
                                    if (thumbTypesArray[key] == 'LARGE') {
                                        allFiles.large = baseUrl + uploadPath + result[0]._id + '/' + largeThumbParameter + result[0].name + result[0].extension;
                                    }
                                }
                                media.push(allFiles);
                                return media;
                            }
                        }
                    }
                }
            } else {
                return media;
            }
        });
};

/**
 * Getting a Media file from server
 * @method getMediaObject
 * @param {Integer} fileId
 * @returns {promise}
 */

var getMediaObject = exports.getMediaObject = function (fileId, thumbTypes) {
    var media = [];

    var uploadPath = config.path.uploadPath;
    var smallThumbParameter = config.path.postSmallThumb;
    var mediumThumbParameter = config.path.postMediumThumb;
    var query = {
        _id: {$in: fileId},
        status: 1 // i-e status is active\
    };
    return getCollection(consumerFileUpload, query, {}, {})
        .then(function (result) {
            if (result.length > 0) {
                var allFiles = {};
                _.forEach(result, function (value, key) {
                    var fileType = 'IMAGE';
                    var allFiles = {};
                    allFiles._id = value._id;
                    var thumbTypes = "*";
                    if (fileType == 'IMAGE') {
                        if (thumbTypes == '*') {
                            // i-e for required all types of thumbs
                            for (var i = 0; i < value.thumbs.length; i++) {
                                if (value.thumbs[i].sizetype == 'SMALL') {
                                    allFiles.small = config.baseUrl.fileServer + uploadPath + value._id + '/' + config.path.thumb + smallThumbParameter + value.file_name + value.extension;
                                }
                                if (value.thumbs[i].sizetype == 'MEDIUM') {
                                    allFiles.medium = config.baseUrl.fileServer + uploadPath + value._id + '/' + config.path.thumb + mediumThumbParameter + value.file_name + value.extension;
                                }
                            }
                            media.push(allFiles);

                        }
                    }

                })
                return media;

            }

        });
};

var getCollection = exports.getCollection = function (collectionName, queryObj, reqFieldObj, statsObj) {


    if (statsObj != '{}') {
        return new Promise(function (resolveFetch) {


            collectionName.find(queryObj, reqFieldObj,
                {
                    limit: statsObj.limit,
                    sort: statsObj.sortBy,
                    skip: statsObj.skip
                },
                function (err, fetchDataObj) {
                    if (err) {
                        //console.log(chalk.green('  ======== In getCollection, Error is : ========', err));
                        resolveFetch(null);
                    } else {
                        //console.log(chalk.green('  ======== In getCollection, fetchDataObj: ========'));
                        resolveFetch(fetchDataObj);
                    }
                }).lean(true)
        })
            .then(function (fetchDataObj) {
                return fetchDataObj;
            })
    }
    else {
        return new Promise(function (resolveFetch) {
            collectionName.find(queryObj, function (err, fetchDataObj) {
                if (err) {
                    //console.log(chalk.green('  ======== In getCollection, Error is : ========', err));
                    resolveFetch(null);
                } else {
                    //console.log(chalk.green('  ======== In getCollection, fetchDataObj: ========'));
                    resolveFetch(fetchDataObj);
                }
            }).lean(true)
        })
            .then(function (fetchDataObj) {
                return fetchDataObj;
            })
    }
};

var updateCollection = exports.updateCollection = function (collectionName, conditonObj, updateObj) {
    return new Promise(function (resolveData) {

        collectionName.findOneAndUpdate(conditonObj, updateObj, {new: true}, function (err, fetchData) {

            if (err) {
                resolveData(null);
            } else {
                resolveData(fetchData);
            }

        })

    }).then(function (fetchDataObj) {
            return fetchDataObj
        })


}

var insertCollection = exports.insertCollection = function (collectionName, dataObj) {

    return new Promise(function (resolveInsertion) {
        collectionName.save(function (err, dataObj) {
            if (!err) {
                dataObj
            } else {
                resolveInsertion(null)
            }
            resolveInsertion(dataObj);
        })
    })
        .then(function (inserted) {
            return inserted;
        });
};

//update document in Collection via push key
var updateCollectionViaPushKey = exports.updateCollectionViaPushKey = function (collectionName, pushKeyObject, options, queryObj, callback) {
    collectionName.findOneAndUpdate(
        queryObj,
        {
            $push: pushKeyObject
        },
        options,
        function (err, updateResult) {
            return callback(err, updateResult);
        }
    );
};

var updateCollectionViaAddToSet = exports.updateCollectionViaAddToSet = function (collectionName, pushKeyObject, options, queryObj, callback) {
    collectionName.findOneAndUpdate(
        queryObj,
        {
            $addToSet: pushKeyObject
        },
        function (err, updateResult) {
            return callback(err, updateResult);
        }
    );
};

var renderUser = exports.renderUser = function (id) {
    var userObject = {};
    var profile_image_id;

    return new Promise(function (resolveUser) {
        var queryObj = {"_id": id}
        var requiredObj = {"name": 1, "profile_image_id": 1, "bio": 1, "views": 1, "categories": 1, "home_location": 1, "location":1, "fb_login":1};
        getCollection(consumer, queryObj, requiredObj, {})
            .then(function (data) {
                userObject.id = data[0]._id;
                userObject.bio = data[0].bio;
                userObject.location = data[0].home_location || data[0].location;
                userObject.categories = data[0].categories;
                userObject.name = data[0].name;
                profile_image_id = data[0].profile_image_id;
                userObject.link = new Array(config.webURL.domain, userObject.name).toURL();
                userObject.fb_profile = data[0].fb_login
            })
            .then(function () {
                getMediaObject(profile_image_id, '*')
                    .then(function (data) {
                        userObject.media = data;
                        resolveUser(userObject);
                    })
            })

    }).then(function (resolveUser) {
            return resolveUser;
        })
}

var renderPost = exports.renderPost = function (post_id) {

    var queryobject = {_id: post_id};
    var uploadPath = config.path.uploadPath;
    var smallThumbParameter = config.path.postSmallThumb;
    var mediumThumbParameter = config.path.postMediumThumb;
    //var media = [];
    //return getCollection(consumerPost, queryobject, {}, {})
    //    .then(function (data) {
    //        if (data[0].post_image_id != null) {
    //            return data[0].post_image_id;
    //        }
    //        //console.log("SSSSS", data[0].post_image_id);
    //        return null;
    //    }).then(function (media_id) {
    //        if (media_id == null) {
    //            throw new Error('media not found');
    //        }
    //        else {
    //            return getMediaObject(media_id, '*')
    //                .then(function (data) {
    //                    return data;
    //                })
    //
    //        }
    //    })

    var feedsData= {};
    return getCollection(consumerPost, queryobject, {}, {})
        .then(function (data) {

            feedsData.post = data[0];
            var post_media_Ids = data[0].post_image_id;
            return post_media_Ids;
        })
        .then(function (postImageIds) {
            return getCollection(consumerFileUpload, {_id: postImageIds}, {}, {})
                .then(function(postMedia) {
                    var value = postMedia[0];
                    if (_.isEmpty(feedsData.post.post_image_id)) {
                        feedsData.post.media = {}
                    }
                    else if(feedsData.post.post_image_id.toString() == value._id.toString()) {
                        console.log("matched")
                        var media = [];
                        var fileType = 'IMAGE';
                        var allFiles = {};
                        var thumbTypes = "*";
                        if (fileType == 'IMAGE') {
                            if (thumbTypes == '*') {
                                // i-e for required all types of thumbs
                                for (var i = 0; i < value.thumbs.length; i++) {
                                    if (value.thumbs[i].sizetype == 'SMALL') {
                                        allFiles.small = config.baseUrl.fileServer + uploadPath + value._id + '/' + config.path.thumb + smallThumbParameter + value.file_name + value.extension;
                                    }
                                    if (value.thumbs[i].sizetype == 'MEDIUM') {
                                        allFiles.medium = config.baseUrl.fileServer + uploadPath + value._id + '/' + config.path.thumb + mediumThumbParameter + value.file_name + value.extension;
                                    }
                                }
                                media.push(allFiles);
                                feedsData.post.media = media;
                                //delete feedsData[k].data.post_image_id;
                            }
                        }
                    }
                    return feedsData;
                })
            return feedsData;
        })
        .then(function(feedsData) {
            console.log("consumer id",feedsData.post.consumer_id)
            return renderUser(feedsData.post.consumer_id)
                .then(function (user) {
                    console.log(user)
                    feedsData.user = user;
                    return feedsData;
                })
            return feedsData;
        })

}

var incrementValue = exports.incrementValue = function (collectionName, conditonObj, keyObject) {

    return new Promise(function (resolveData) {

        collectionName.update(
            conditonObj,
            {$inc: keyObject}
            , function (err, doc) {
                if (err)
                    resolveData(err);
                else {
                    resolveData(doc);
                }
            })

    }).then(function (resolveData) {
            return resolveData;
        })


}

var getAllUser = exports.getAllUser = function (collectionName, Array, required) {

    return new Promise(function (resolveData) {

        collectionName.find({_id: {$in: Array}}, required
            , function (err, doc) {
                if (err)
                    resolveData(err);
                else {
                    resolveData(doc);
                }
            }).lean(true)

    }).then(function (resolveData) {
            return resolveData;
        })


}

//get data with aggregate on unwind, match, group and project
exports.getAggregateCollectionUnwind = function (collectionName, unwindBy, queryObj, groupBy, projectBy) {

    return new Promise(function (firstPromiseResolve) {
        collectionName.aggregate([
            {
                $unwind: unwindBy
            },
            {
                $match: queryObj
            },
            {
                $group: groupBy
            },
            {
                $project: projectBy
            }
        ], function (err, result) {
            if (err) {
                firstPromiseResolve(err);
            } else {
                firstPromiseResolve(result);
            }
        });
    })
        .then(function (firstPromiseResult) {

            return firstPromiseResult;
        });
};

var getFeedUser = exports.getFeedUser = function (uids) {
    var finalObj = [];


    // var baseUrl = config.baseUrl.socketFileServer;
    var uploadPath = config.path.uploadPath;
    var smallThumbParameter = config.path.postSmallThumb;
    var mediumThumbParameter = config.path.postMediumThumb;
    var userStats={};

    return getAllUser(consumer, uids, {})
        .then(function (allUsers) {
            //finalObj = allUsers;
            var media_ids = [];
            for (var i = 0; i < allUsers.length; i++) {

                media_ids.push(allUsers[i].profile_image_id);
                finalObj.push({
                    id: allUsers[i]._id,
                    name: allUsers[i].name,
                    link: new Array(config.webURL.domain, allUsers[i].name).toURL(),
                    profile_image_id: allUsers[i].profile_image_id,
                    fb_profile:allUsers[i].fb_login,
                    user_stats:allUsers[i].user_stats
                })

            }


            return media_ids;

        })
        .then(function (medias) {
            return getAllUser(consumerFileUpload, medias, {})
                .then(function (res) {
                    _.forEach(res, function (value, key) {
                        _.forEach(finalObj, function (val, k) {
                            if (_.isEmpty(val.profile_image_id)) {
                                finalObj[k].media = [];
                            }
                            else if (val.profile_image_id.toString() == value._id.toString()) {
                              //console.log("matched")
                                var media = [];
                                var fileType = 'IMAGE';
                                var allFiles = {};
                                var thumbTypes = "*";
                                if (fileType == 'IMAGE') {
                                    if (thumbTypes == '*') {
                                        // i-e for required all types of thumbs
                                        for (var i = 0; i < value.thumbs.length; i++) {
                                            if (value.thumbs[i].sizetype == 'SMALL') {
                                                allFiles.small = config.baseUrl.fileServer + uploadPath + value._id + '/' + config.path.thumb + smallThumbParameter + value.file_name + value.extension;
                                            }
                                            if (value.thumbs[i].sizetype == 'MEDIUM') {
                                                allFiles.medium = config.baseUrl.fileServer + uploadPath + value._id + '/' + config.path.thumb + mediumThumbParameter + value.file_name + value.extension;
                                            }
                                        }
                                        media.push(allFiles);
                                        finalObj[k].media = media;
                                    }
                                }

                            }
                        })
                    })
                    return finalObj;
                })
            return finalObj;
        })


}

//update document in Collection via pull key
var updateCollectionViaPullKey = exports.updateCollectionViaPullKey = function (collectionName, pullKeyObject, options, queryObj, callback) {
    collectionName.findOneAndUpdate(
        queryObj,
        {
            $pull: pullKeyObject
        },
        options,
        function (err, updateResult) {
            return callback(err, updateResult);
        }
    );
};

var getAllFeed = exports.getAllFeed = function (statsObj, queryobj) {
    var feedsData = [];
    var uploadPath = config.path.uploadPath;
    var smallThumbParameter = config.path.postSmallThumb;
    var mediumThumbParameter = config.path.postMediumThumb;

    return getCollection(consumerPost, queryobj, {}, statsObj)
        .then(function (feeds) {
            var post_media_Ids = [];
            _.forEach(feeds, function (value, key) {
                feedsData.push({data: value});
                post_media_Ids.push(value.post_image_id);
            })
            return post_media_Ids;
        })
        .then(function (postImageIds) {
            return getAllUser(consumerFileUpload, postImageIds, {})
                .then(function (postMedia) {

                    _.forEach(postMedia, function (value, key) {
                        _.forEach(feedsData, function (val, k) {
                            if (_.isEmpty(val.data.post_image_id)) {
                                feedsData[k].data.media = {};
                                //delete feedsData[k].data.post_image_id;
                            }
                            else if (val.data.post_image_id.toString() == value._id.toString()) {
                                var media = [];
                                var fileType = 'IMAGE';
                                var allFiles = {};
                                var thumbTypes = "*";
                                if (fileType == 'IMAGE') {
                                    if (thumbTypes == '*') {
                                        // i-e for required all types of thumbs
                                        for (var i = 0; i < value.thumbs.length; i++) {
                                            if (value.thumbs[i].sizetype == 'SMALL') {
                                                allFiles.small = config.baseUrl.fileServer + uploadPath + value._id + '/' + config.path.thumb + smallThumbParameter + value.file_name + value.extension;
                                            }
                                            if (value.thumbs[i].sizetype == 'MEDIUM') {
                                                allFiles.medium = config.baseUrl.fileServer + uploadPath + value._id + '/' + config.path.thumb + mediumThumbParameter + value.file_name + value.extension;
                                            }
                                        }
                                        media.push(allFiles);
                                        feedsData[k].data.media = media;
                                        //delete feedsData[k].data.post_image_id;
                                    }
                                }
                            }
                        })
                    })

                    return feedsData;
                })
            return feedsData;
        })
}

var insertLocation = exports.insertLocation = function (location) {

    var userlocation = {};
    userlocation.date = Utils.getUnixTimeStamp();
    userlocation.location = [67, 112];
    userlocation.location_name = "pakistan";
    var options = {safe: true, upsert: true};
    var queryObj = {consumer_id: sessionUser.user._id};
    //var location = consumerLocation({
    //    consumer_id: sessionUser.user._id,
    //    location_history: userlocation
    //});
    //
    //helpers.insertCollection(location)
    //    .then(function(data){
    //        console.log(data);
    //    })
}

var insertModify = exports.insertModify = function (collectionName, queryObj, update, options, callback) {

    return new Promise(function (resolveData) {
        collectionName.findOneAndUpdate(queryObj, update, options, function (err, fetchData) {

            if (err) {
                resolveData(null);
            } else {
                resolveData(fetchData);
            }

        })

    }).then(function (fetchDataObj) {
            return fetchDataObj
        })


}

var removeDocument = exports.removeDocument = function (collectionName,criteria) {

    return new Promise(function (resolveData) {
        collectionName.remove(criteria, function (err, fetchData) {

            if (err) {
                resolveData(null);
            } else {
                resolveData(fetchData);
            }

        })

    }).then(function (fetchDataObj) {
            return fetchDataObj
        })



}

var getUserStats = exports.getUserStats  = function(userId){

    var totalPost=0;
    var totalLikes=0;
    var totalComments=0;

    var text;
    var stats={};
    var queryObj = {"consumer_id": userId};
    return getCollection(consumerPost, queryObj, {}, {})
        .then(function (userPost) {
            totalPost = userPost.length;
            _.forEach(userPost, function (value, key) {
                totalLikes+= value.total_likes;
                totalComments+=value.total_comments;

            });
            stats.text =  totalLikes +" Likes" +" across "+ totalPost + " Post";
            stats.total_likes =  totalLikes;
            stats.total_posts = totalPost;
            stats.total_comments = totalComments;
            return stats;
        })

}

var socialLogin = exports.socialLogin = function(data ,req ,res){

    var queryObj = {'fb_login.id':data};
    var platform = req.body.platform || null;
    var platform_version = req.body.platform_version|| null;
    var model = req.body.model || null;
    var user;
    return getCollection(consumer,queryObj,{},{})
        .then(function(data) {
            if (data.length == 0) {
                res.status(400).send({meta: {status: 400, message: 'Login Failed with Facebook'}})
            }else {
                var user=data[0];
                var userId = data[0]._id;
                var token = Utils.generateToken(data[0]._id);
                var conditonObj = {consumer_id:userId};
                var updateObj= {
                    token: token,
                    consumer_id: userId,
                    platform: platform,
                    platform_version: platform_version,
                    model: model,
                    status: 'ACTIVE'
                }
                Sessions.findOneAndUpdate(conditonObj, updateObj, {upsert:true}, function (err, data) {
                    if (err) {
                       throw  err;
                    } else {
                        var token = data.token;
                        res.status(200).send({
                            meta: {
                                status: 200,
                                message: 'Success',
                                data: {auth: {token: token, user: user}}
                            }
                        })

                    }

                })
            }
        })


}


var stats = exports.stats = function(userid){
    var totalPost=0;
    var totalLikes=0;
    var totalComments=0;
    var stats={};
    var queryObj = {"consumer_id": userid};
    return getCollection(consumerPost, queryObj, {"total_comments":1, "total_likes":1}, {})
        .then(function (userPost) {
            totalPost = userPost.length;
            _.forEach(userPost, function (value, key) {
                totalLikes+= value.total_likes;
                totalComments+=value.total_comments;
            });
            stats.total_likes =  totalLikes;
            stats.total_posts = totalPost;
            stats.total_comments = totalComments;
            var conditionObj = {'_id' : userid};
            var setObject = {user_stats:stats};
            updateCollection(consumer,conditionObj,setObject);
            console.log("USER",stats);
        })
}



exports.checkDirectory = function(folderPath){

    return new Promise(function (promiseResolve) {

        return fsExtra.ensureDir(folderPath, function (err) {
            if (err) {
                promiseResolve('directory not exist');
            }
            else {
                promiseResolve('directory exist');
            }
        })
    }).then(function(result){
            return result;
        })
}

exports.checkFile = function (filepath){

    return new Promise(function (promiseResolve) {

        return fsExtra.ensureFile(filepath, function (err) {
            if (err) {
                promiseResolve('file not exist');
            }
            else {
                fsExtra.remove(filepath, function (err) {
                    if (err) return console.error(err)
                    promiseResolve('file exist ');
                })


            }
        })
    }).then(function(result){
            return result;
        })




}

exports.convertHtmlToImage = function(template,filepath){

    var webshot = require('webshot');
    return new Promise(function(resolve){
        webshot(template, filepath, {siteType:'html'}, function(err) {
            if(err == null){
                resolve(true);
            }else{
                resolve(false);

            }
        })

    }).then(function(data){
            return data;
        })



}

exports.sharePostImage = function(fileParamsObj){

    console.log("SAVE DATA ",fileParamsObj);
    return new Promise(function(resolvePromise){

        //now saving new file in collection
        var mediaObject = {
            consumer_id: fileParamsObj.uid,
            file_name: fileParamsObj.fileName,
            extension: fileParamsObj.fileExtension,
            width: fileParamsObj.width,
            path: fileParamsObj.source,
            height: fileParamsObj.height,
            image_type: fileParamsObj.fileOf,
            thumbs: [],


        }

        var consumer_file_upload = new consumerFileUpload(mediaObject);
        consumer_file_upload.save(function (err, dataObj) {
            var insertedId = null;
            if (!err) {
                insertedId = dataObj._id;
                console.log('No Error in Saving Collection', insertedId);
                resolvePromise(insertedId);
            } else {
                console.log('Error in Saving Collection',err);
                resolvePromise(insertedId);
            }
        });




    })




}

exports.getShareMedia = function(fileID){

    var media = [];
    var fileType = 'IMAGE';
    var uploadPath = config.path.uploadPath;
    var query = {
        _id: {$in: fileID},
        status: 1 // i-e status is active\
    };

    return getCollection(consumerFileUpload, query, {}, {})
        .then(function (result) {
            if (result.length > 0) {
                var media = {};
                if(fileType == "IMAGE"){
                    media.small = config.baseUrl.fileServer + uploadPath + result[0]._id + '/'+ "org/" + "ORG/"  +  result[0].file_name + result[0].extension;
                }
                console.log("MEDIA FOUND",media);
                return media;

            }
        });


}
