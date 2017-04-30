/**
 * Created by Wasiq on 7/21/2016.
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var Sessions = new Schema({
        //_id: ObjectId,
        "consumer_id": {
            "type": Schema.Types.ObjectId, ref: 'Consumers'
        },
        "token": {
            "type": String , required: true
        },
        "platform": {
            "type": String ,default: 'null'
        },

        "platform_version": {
            "type": String ,default: 'null'
        },

        "model": {
            "type": String, default: 'null'
        },
        "status":{
            type: String
        }

    }
    ,{ timestamps: { createdAt: 'created' , updatedAt : 'updated' }  }

);


module.exports = mongoose.model('Sessions', Sessions);