/**
 * Created by Wasiq on 7/18/2016.
 */
exports.dataConnections = {
    'secret': 'test',
    'database': 'mongodb://localhost/careempromos'

};

exports.encryption = {
    salt: "b6a4907f78fb5fe40133ff2c77a782cd77662f00cd98536f0db6a16044867e26",
    size: 40
}

exports.emailCredentials = {
    email: "careempromos@gmail.com",
    password : "F00d_4thought"

}

exports.webURL = {
    domain: '',
    cdn: ''
};

exports.path = {
    //rootPath: appDir.replace(/\\/g, "/") + '/',     // for linux remove this replacement
    uploadPath: 'resources/uploads/',
    profilePath: 'profile/',
    postsFilePath: 'posts/',
    postSmallThumb: 'small/',
    postMediumThumb: 'medium/',
    thumb:'thumb/',
    sharePost:'share/'

}

//image configuration
exports.imageConfig = {
    maxCompressWidth: 2048,
    maxCompressHeight: 2048
}



exports.thumbDirName = {
    //profile: ["100x100", "200x200", "400x400"],
    profile: ["small", "medium"],
    //post: ["150x150", "640x360", "1280x720"],
    post: ["small", "medium"]

}



exports.thumbSize = {
    profile: [
        {
            "width": 200,
            "height": 200
        },
        {
            "width": 400,
            "height": 400
        }

    ],

    post: [
        {
            "width": 0,
            "height": 0
        },
        {
            "width": 150,
            "height": 150
        }
    ],

    categories: [
        {
            "width": 128,
            "height": 128
        },
        {
            "width": 256,
            "height": 256
        },
        {
            "width": 150,
            "height": 150
        }
    ],

    postGreater1024: [0.4, 0.55, 0.7],
    postLesser1024: [0.7, 0.85, 1.0]

}


exports.baseUrl = {
    fileServer: 'http://192.168.43.76:30001/',
    apiServer: 'http://192.168.43.76:30001/'
}
