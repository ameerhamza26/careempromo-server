/**
 * Created by Wasiq on 8/5/2016.
 */


var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var consumers_location = new Schema({
        //_id: ObjectId,
        "consumer_id": {
            "type": Schema.Types.ObjectId, ref: 'Consumers' , default:null
        },
        "location_history" : [{
            date: {type: Number},
            location :{type: Array},
            location_name :{type: String}
        }],
        "search_history":[{
            date: {type: Number},
            location :{type: Array},
            location_name :{type: String}
        }]
    }
    , {timestamps: {createdAt: 'created', updatedAt: 'updated'}}
);


module.exports = mongoose.model('consumers_location', consumers_location);