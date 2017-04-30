/**
 * Created by Wasiq on 7/18/2016.
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var consumer_post = new Schema({
        //_id: ObjectId,
        "consumer_id": {
            "type": Schema.Types.ObjectId, ref: 'Consumers' , default:null
        },
        "post_image_id": {
            type: Schema.Types.ObjectId, ref: 'consumer_file_upload' ,default: null
        },
        "price": {
            "type": Number , default: 0
        },
        "remark": {
            "type": String ,default: null
        },
        "category":{
            "type": Array ,default: []
        },

        "views":{
            "type":Number,
        },

        "status":{
            "type": Boolean  , default: 1
        },

        "location":{
            "type": Array , index: "2d"
        },

        "tag":{
            "type":Array , default: []
        },

        "total_comments":{
            "type": Number , default: 0
        },

        "total_likes":{
            "type": Number , default: 0
        },
        "location_name" : {
            "type": String
        },
        "place" : {
            "type": String, default: 'null'
        },
        "createdTimeStamp":{
            "type": Number
        },

        "comments": [{
            text: String,
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumers'} ,
            created : {type : Number}
        }],

        "likes" :[{
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumers'} ,
            created : {type : Number}
        }]

    }
    ,{ timestamps: { createdAt: 'created' , updatedAt : 'updated' }  }

);


module.exports = mongoose.model('consumer_post', consumer_post);