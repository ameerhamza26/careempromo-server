var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var Consumers = new Schema({
        //_id: ObjectId,
        "name": {
            "type": String, required: true
        },
        "first_name": {
            "type": String, default: null
        },

        "last_name": {
            "type": String, default: null
        },

        "email": {
            "type": String,  default:null
        },
        "password": {
            "type": String,
        },

        "brand" : {
            "type" : Boolean, default: 0
        },

        "customer" : {
            "type" : Boolean, default: 0
        },
        
        "profile_image_id": {
            type: Schema.Types.ObjectId, ref: 'consumer_file_upload', default: null
        },
        "date_of_birth": {
            "type": String, default:null
        },

        "bio": {
            "type": String, default: null
        },

        "gender": {
            "type": String, default: null
        },
        "mobile_no": {
            "type": String, default: 0
        },
        "country_code":{
            "type": String, default: 0
        },
        "status": {
            "type": Boolean, default: 1
        },

        "location":{
            "type": Object , default: 0
        },

        "fb_login": {
            "type": Object , default: 0
        },
        home_location: {
            "type": Object , default: 0
        },
        category: {
            "type": Array, default: []
        },
        on_boarding: {
            "type": Number, default: 0
        },

        radius: {
            "type": Number, default: 0
        },

        user_stats:{
            "type": Object , default: 0
        },
        updated_consumer: {
            "type": Number, default: 0
        },
        resetPasswordToken: {
            "type": String, default: null
        },
        resetPasswordExpires : {
            "type": Date
        },
        privacy:{
          "type":String , default:'PRIVATE'
        },

        questions: [],

    }
    , {timestamps: {createdAt: 'created', updatedAt: 'updated'}}
);


module.exports = mongoose.model('Consumers', Consumers);