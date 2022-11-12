/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict'; 
    
    // register api callback
    window.fbAsyncInit = function () {
        FB.init({
          appId      : '637708559671782',
          xfbml      : true,
          version    : 'v2.1'
        });
      };
    
    var g_facebook_sdk_loaded = false;    
    utils.loadscript('//connect.facebook.net/en_US/sdk.js', 'facebook-sdk', 
                     function () { g_facebook_sdk_loaded = true; });

    //--
    var Facebook = function () {
        //--
        this.sdk_loaded = g_facebook_sdk_loaded;
    };

    Facebook.prototype.init = function () {
        //--
    };

    Facebook.prototype.save = function (filename, description, dataURI) {
        //--
        var that = this;
        
        //--
        if (!this.sdk_loaded) {
            window.alert("couldn't load facebook sdk!");
            return;
        }        

        //--
        description += " using Paletta!";

        //--
        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                that.__postImage(response.authResponse.accessToken, filename, description, dataURI);
            } else {
                FB.login(function (response) {that.__postImage(response.authResponse.accessToken, filename, description, dataURI);}, {scope: 'publish_actions,user_photos'});
            }
        });
    };

    Facebook.prototype.__postImage = function (authToken, filename, description, dataURI) {
        //--
        var blob = utils.dataURItoBlob(dataURI);
        var formData = new FormData();
        formData.append('source', blob, filename);
        formData.append('message', 'description');
        //--
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://graph.facebook.com/me/photos?access_token=' + authToken, true);
        xhr.onload = function () {
            if (xhr.status == 200) {
                window.alert("the painting was successfully uploaded!");
            } else {
                window.alert("the request failed: "+xhr.statusText);
            }
        };
        xhr.onerror = function () {
            window.alert("network error!");
        };
        xhr.send(formData);
    };

    paletta.Facebook = Facebook;
}());
