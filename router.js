var responseTime = require('response-time');
var user = require('./controller/user');
var post = require('./controller/post');
var media = require('./controller/media');
var admin = require('./controller/admin');

module.exports = function(api){

        //#############################################################
        //##################### REST API ################3#############
        //#############################################################

        //USER REST API
        api.post('/register',                                           user.register);
        api.post('/login',                                              user.login );
        api.post('/logout',                                             user.logout);

       // api.get('/consumer/:id',                                        user.getConsumerProfile);
        api.post('/update/profile',                                     user.updateProfile);

        api.post('/location/update',                                    user.locationUpdate);
        api.post('/location',                                           user.insertLocation);
        api.get('/user/:id/post',                                       user.getAllPost);
        api.post('/updatecategories',                                   user.updateCategory);

        //POST REST API
        api.post('/posts',                                              post.create);
        api.get('/feeds',                                               post.getAllFeeds);
        
        api.get('/categories',                                          admin.getCategories);




        //#############################################################
        //##################### Media Upload ############3#############
        //#############################################################
        api.post('/upload/image' ,                                      media.upload);
        api.get('/resources/uploads/:id/:isthumb/:sizetype/:filename',  media.getUploadedFiles); //for reading all uploaded files


        Array.prototype.toURL = function () {
                return this.join('/');
        };



};
