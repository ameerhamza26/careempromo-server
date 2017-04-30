/**
 * Created by Wasiq on 16-12-2016.
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var post_report = new Schema({
        //_id: ObjectId,
        "report_user": {
            name: String,
            user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumers'} ,
        },
        "status": {
            "type": String ,
        },
        "report_type": {
            "type": String
        },
        "post_id": {
            "type": Schema.Types.ObjectId, ref: 'consumer_post' , default:null
        }

    }
    ,{ timestamps: { createdAt: 'created' , updatedAt : 'updated' }  }

);


module.exports = mongoose.model('post_report', post_report);