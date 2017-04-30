/**
 * Created by Wasiq on 7/18/2016.
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var consumer_file_upload = new Schema({
        //_id: ObjectId,
        "consumer_id": {"type": Schema.Types.ObjectId, ref: 'Consumers' , default: null},
        "file_name": {type: String, required: true},
        "extension": {type: String, required: true},
        "width": {type: Number, required: false},
        "height": {type: Number, required: false},
        "image_type": {type: String, required: true},
        "status":{"type": Boolean  , default: 1},
        "path":{type : String},
        "thumbs": {type: Array, default: []},

    }
    ,{ timestamps: { createdAt: 'created' , updatedAt : 'updated' }  }

);


module.exports = mongoose.model('consumer_file_upload', consumer_file_upload);