/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    var CLIENT_ID     = '1698';
    var CLIENT_SECRET = '37f8586d919d6d6739fee707e3937ea7';
    var CORS_PROXY    = 'https://cors-anywhere.herokuapp.com/';

    var AUTHORIZATION_URL = 'https://www.deviantart.com/oauth2/authorize';
    var ACCESS_TOKEN_URL  = CORS_PROXY + 'https://www.deviantart.com/oauth2/token';
    var SUBMIT_API_URL    = CORS_PROXY + 'https://www.deviantart.com/api/oauth2/stash/submit';
    var APPNAME = 'Paletta';
    
    function getRedirectURI() {
        return location.href.split('?')[0] + '?redirect=deviantart'
    }

    //--
    var DeviantArt = function () {
        //--
        this.expire_time   = null;
        this.access_token  = null;
        this.refresh_token = null;
    };

    DeviantArt.prototype.init = function () {
        //--
        var token = '?redirect=deviantart&code=';
        var index = window.location.search.indexOf(token);
        if (index != -1) {
            var code = window.location.search.substring(index+token.length).split('&')[0];
            this.__reqAccessTokens(code, function (error) {
                if (error)
                    return;
                window.location.href = location.href.split('?')[0];
            });
        } else {        
            this.expire_time   = localStorage.getItem("deviantart.expire_time");
            this.access_token  = localStorage.getItem("deviantart.access_token");
            this.refresh_token = localStorage.getItem("deviantart.refresh_token");
        }
    };

    DeviantArt.prototype.save = function (filename, description, dataURI) {
        //--
        var that = this;

        //--
        this.__getAccessToken(
            function (error) {
                if (error) {
                    return;
                }
                var blob = utils.dataURItoBlob(dataURI);
                var formData = new FormData();
                formData.append('title', description);
                formData.append('artist_comments', 'Created using Paletta');
                formData.append('folder', 'Paletta');
                formData.append('keywords', 'Paletta');
                formData.append('file', blob, filename);
                that.__httpRequest('POST', SUBMIT_API_URL+'?access_token='+that.access_token, formData, [], function (response) {
                    //--
                    if (response && response.stashid) {
                        //console.log("sta.sh Id="+response.stashid);
                        window.alert("the painting was successfully uploaded!");
                    }
                });
            }
        );
    };

    DeviantArt.prototype.__getAccessToken = function (callback) {
        // the access token is not available or has expired
        var currTime = Math.round((new Date()).getTime() / 1000);
        if (this.access_token == null || currTime >= this.expire_time) {
            if (this.access_token) {
                this.__refreshAccessToken(callback);
            } else {
                this.__authorizeAccess();
            }
        } else {
            callback(false);
        }
    };
    
    DeviantArt.prototype.__refreshAccessToken = function (callback) {
        //--
        var that = this;
        
        //--
        var params = 'grant_type=refresh_token' +
                     '&client_id=' + encodeURIComponent(CLIENT_ID) +
                     '&client_secret=' + encodeURIComponent(CLIENT_SECRET) +
                     '&refresh_token=' + that.refresh_token;
        that.__httpRequest('POST', ACCESS_TOKEN_URL, params, [{type:'Accept', value:'application/json'}, {type:'Content-type', value:'application/x-www-form-urlencoded'}], function (response) {
            //--
            if (response && response.access_token) {
                that.__saveAccessTokens(response);
                callback(false);
            } else {
                callback(true);
            }
        });
    }

    //--
    DeviantArt.prototype.__reqAccessTokens = function (code, callback) {
        //--
        var that = this;
        
        //--
        var redirectURI = getRedirectURI();
        var params = 'grant_type=authorization_code' +
                     '&client_id=' + encodeURIComponent(CLIENT_ID) +
                     '&client_secret=' + encodeURIComponent(CLIENT_SECRET) +
                     '&redirect_uri=' + encodeURIComponent(redirectURI) +
                     '&code=' + code;
        that.__httpRequest('POST', ACCESS_TOKEN_URL, params, [{type:'Accept', value:'application/json'}, {type:'Content-type', value:'application/x-www-form-urlencoded'}], function (response) {
            //--
            if (response && response.access_token) {
                that.__saveAccessTokens(response);
                callback(false);
            } else {
                callback(true);
            }
        });
    }

    DeviantArt.prototype.__authorizeAccess = function () {
        //--
        var redirectURI = getRedirectURI();
        var params = '?response_type=' + 'code' +
                     '&client_id=' + encodeURIComponent(CLIENT_ID) +
                     '&redirect_uri=' + encodeURIComponent(redirectURI) +
                     '&scope=' + 'stash';
        window.open(AUTHORIZATION_URL + params, '_self');
    }

    DeviantArt.prototype.__saveAccessTokens = function (response) {
        //--
        //console.log("access_token="+response.access_token);
        var currTime = Math.round((new Date()).getTime() / 1000);
        this.expire_time   = currTime + response.expires_in;
        this.access_token  = response.access_token;
        this.refresh_token = response.refresh_token;
        //--
        localStorage.setItem("deviantart.expire_time", this.expire_time);
        localStorage.setItem("deviantart.access_token", this.access_token);
        localStorage.setItem("deviantart.refresh_token", this.refresh_token);
    };

    DeviantArt.prototype.__httpRequest = function (method, url, params, headers, callback) {
        //--
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.onload = function () {
            if (xhr.status == 200) {
                callback(JSON.parse(xhr.responseText));
            } else {
                console.log("http request to '" + url + "' failed: " + xhr.statusText);
                callback(null);
            }
        };
        xhr.onerror = function () {
            window.alert("network error!");
            callback(null);
        };
        for (var i = 0, n = headers.length; i < n; ++i) {
            var header = headers[i];
            xhr.setRequestHeader(header.type, header.value);
        }
        xhr.send(params);
    };

    paletta.DeviantArt = DeviantArt;
}());
