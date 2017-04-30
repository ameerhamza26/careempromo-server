/**
 * Created by Wasiq on 8/24/2016.
 */
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var survey_questions = new Schema({
        //_id: ObjectId,
        "question": {
            "type": String , required: true
        },
        "answers":{
            "type": Array , default : []
        }

    }
    ,{ timestamps: { createdAt: 'created' , updatedAt : 'updated' }  }

);


module.exports = mongoose.model('survey_questions', survey_questions);