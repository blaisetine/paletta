/* Copyright 2014, Blaise Tine. */

var utils = utils || {};

(function () {
    'use strict';

    //--
    var indexedDB = window._indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;
    var dbVersion = 1;

    var FileDataDB = function (appName, folder) {
        //--
        this.db = null;
        this.appName = appName;
        this.folder = folder;
    };

    FileDataDB.prototype.init = function () {
        //--
    };

    FileDataDB.prototype.__ensureInitialized = function (callback) {
        //--
        var that = this;

        //--
        if (this.db) {
            callback(this.db);
            return;
        }

        //--
        function errorHandler(e) {
            console.log('Error', e);
        }

        //--
        var request = indexedDB.open(this.appName, dbVersion);

        //--
        request.onsuccess = function (e) {
            that.db = e.target.result;
            callback(that.db);
        };
        
        var folder = this.folder;

        //--
        request.onupgradeneeded = function (e) {
            var db = e.target.result;
            db.onerror = errorHandler;
            if (db.objectStoreNames.contains(folder)) {
                db.deleteObjectStore(folder);
            }
            db.createObjectStore(folder);
        };

        //--
        request.onerror = errorHandler;
    };

    FileDataDB.prototype.getFiles = function (callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(null, null);
        }
        
        var folder = this.folder;

        //--
        function onInitDB(db) {
            //--
            var trans = db.transaction([folder], "readwrite");
            var store = trans.objectStore(folder);
            var request = store.openCursor();

            //--
            request.onsuccess = function (e) {
                var cursor = e.target.result;
                if (cursor) {
                    callback(cursor.key, cursor.value);
                    cursor.continue();
                } else {
                    callback(null, null);
                }
            };

            //--
            request.onerror = errorHandler;
        }

        //--
        this.__ensureInitialized(onInitDB);
    };

    FileDataDB.prototype.destroy = function (id, callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(false);
        }
        
        var folder = this.folder;

        //--
        function onInitDB(db) {
            //--
            var trans = db.transaction([folder], "readwrite");
            var store = trans.objectStore(folder);
            var request = store.delete(id);

            //--
            request.onsuccess = function (e) {
                callback(true);
            };

            //--
            request.onerror = errorHandler;
        }

        //--
        this.__ensureInitialized(onInitDB);
    };

    FileDataDB.prototype.load = function (id, callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(null);
        }
        
        var folder = this.folder;

        //--
        function onInitDB(db) {
            //--
            var trans = db.transaction([folder], "readwrite");
            var store = trans.objectStore(folder);
            var request = store.get(id);

            //--
            request.onsuccess = function (e) {
                callback(e.target.result);
            };

            //--
            request.onerror = errorHandler;
        }

        //--
        this.__ensureInitialized(onInitDB);
    };

    FileDataDB.prototype.save = function (blob, id, callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(null);
        }
        
        var folder = this.folder;

        //--
        function onInitDB(db) {
            //--
            if (id == null) {
                id = new Date().valueOf();
            }

            //--
            var trans = db.transaction([folder], "readwrite");
            var store = trans.objectStore(folder);
            var request = store.put(blob, id);

            //--
            request.onsuccess = function (e) {
                callback(id);
            };

            //--
            request.onerror = errorHandler;
        }

        //--
        this.__ensureInitialized(onInitDB);
    };

    utils.FileDataDB = FileDataDB;
}());
