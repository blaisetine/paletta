/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';
    
    var g_dropbox_sdk_loaded = false;    
    utils.loadscript('https://www.dropbox.com/static/api/dropbox-datastores-1.2-latest.js', 'dropbox-sdk', 
                     function () { g_dropbox_sdk_loaded = true; });

    //--
    var _Dropbox = function () {        
        //--
        this.client = null;
    };

    _Dropbox.prototype.init = function () {
        //--        
    };

    _Dropbox.prototype.save = function (filename, dataURI) {
        //--
        var that = this;
        
        //--
        if (!g_dropbox_sdk_loaded) {
            window.alert("couldn't load dropbox sdk!");
            return;
        }
        
        //--
        function __save() {
            //--
            var blob = utils.dataURItoBlob(dataURI);

            //--
            that.client.writeFile("/Paletta/"+filename, blob, function (error, stat) {
                if (error) {
                    window.alert(error);
                } else {
                    window.alert("the painting was successfully uploaded!");
                }
            });
        }
        
        if (this.client == null) {
            this.client = new Dropbox.Client({
               key: "bt33af66aedxu03",
               secret: "a63rio09c0brpr2",
               sandbox: true
            });
            var driver = new Dropbox.AuthDriver.Redirect({rememberUser: true});
            this.client.authDriver(driver);
            this.client.authenticate(function (error, client) {
                if (error) {
                    window.alert(error);  // Something went wrong.
                    return;
                }
                __save();
            });
        } else {
            __save();
        }
    };

    paletta.Dropbox = _Dropbox;
}());
