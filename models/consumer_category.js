var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var consumer_category = new Schema({
        //_id: ObjectId,
        "category_name": {
            "type": String , required: true
        },
        "check":{
            "type": String , default: false
        }

    }
    ,{ timestamps: { createdAt: 'created' , updatedAt : 'updated' }  }

);


module.exports = mongoose.model('consumer_category', consumer_category);