/**
 * Created by Wasiq on 7/21/2016.
 */
var config = require('./config');
var Hashids = require("hashids");



//#####################################################################
//########################### REUSABLES ###############################
//#####################################################################

exports.hashPassword = function (password) {
    var crypto = require('crypto');

    var sha1Hash = crypto.createHash('sha1');
    sha1Hash.update(password);

    password = sha1Hash.digest('hex');
    return password;
};

exports.generateToken = function(id){
    //var token;
    //token = jwt.sign(data, config.dataConnections.secret, {});
    //return token;
    //
    var hashids = new Hashids(config.encryption.salt, config.encryption.size);
    var timestamp = Math.floor(Date.now() / 1000);
    return hashids.encode(parseInt(id), timestamp);
}

exports.getUnixTimeStamp = function () {
    return Math.floor(Date.now() / 1000);
};


//returns array of aspect ratio
//for resize POST images
//it works on Width
exports.postResizeRatio = function (width) {
    return new Promise(function (resolveRatio) {
        var ratios = [];
        if (width <= 1024) {
            ratios = config.thumbSize.postLesser1024; // array
        } else if (width > 1024 && width <= 2048) {
            ratios = config.thumbSize.postGreater1024; // array
        }
        resolveRatio(ratios)
    })
        .then(function (ratioArray) {
            return ratioArray;
        });
};

exports.sendEmail = function(email, text){

    var nodemailer = require('nodemailer');
    // Not the movie transporter!
    var email_from = config.emailCredentials.email;
    var pass = config.emailCredentials.password;
    var to = email;
    var subject = "Welcome To Food Monger";

    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: email_from, // Your email id
            pass: pass// Your password
        }
    });

   // var text = "Thanks for becoming a part of foodmonger";

    var mailOptions = {
        from: email_from, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: text , // plaintext body
        // html: '<b>Hello world ?</b>' // You can choose to send an HTML body instead
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
            //res.json({yo: 'error'});
        }else{
            console.log('Message sent: ' + info.response);

            //res.render('index', { title: 'Express' });
        };
    });





}

exports.testemail = function(){


    var nodemailer = require("nodemailer");
    var smtpTransport = require("nodemailer-smtp-transport");

    /*
     Here we are configuring our SMTP Server details.
     STMP is mail server which is responsible for sending and recieving email.
     */
    var smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: "s.wasiq.muhammad@gmail.com",
            pass: ""
        }
    });
            var rand, mailOptions, host, link;
          //  host = req.get('host');
          //  link = "http://" + req.get('host') + "/verify/" + id;
            mailOptions = {
                from: "info.wrapkar@gmail.com",
                to: "ameerhamza810@gmail.com",
                subject: "Please confirm your Email account",
                html: "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">Click here to verify</a>"
            }
            console.log(mailOptions);
            smtpTransport.sendMail(mailOptions, function (error, response) {
                console.log(response)
                if (error) {
                    console.log(error);
                    //res.end("error");
                    return res.json({ error: error.message });
                } else {
                    console.log("Message sent: " + response.message);
                    //return res.json({ success: true });
                    // res.end("sent");
                    //var newVerify = new EmailVerify();
                    //newVerify.verifyId = id;
                    //newVerify.type = req.body.userType;
                    //newVerify.email = req.body.email;
                    //newVerify.save(function (err) {
                    //    if (err) return res.json({ err: err.message });
                    //    return ({ success: true, message: "Email sent successfully" });
                    //});
                }
            });



}

