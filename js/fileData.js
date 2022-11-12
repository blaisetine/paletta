/* Copyright 2014, Blaise Tine. */

var utils = utils || {};

(function () {
    'use strict';

    //--
    var STORAGE_QUOTA_BASELINE = 1000000000; // 1GB
    var PERSISTENT = PERSISTENT || 0;
    var LocalFileSystem = LocalFileSystem || {PERSISTENT:PERSISTENT};

    var FileData = function () {
        //--
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
    };

    FileData.prototype.init = function () {
        //--
    };

    FileData.prototype.getFiles = function (callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(null, null);
        }

        //--
        function onInitFS(fileSystem) {
            //--
            var dirReader = fileSystem.root.createReader();
            dirReader.readEntries(
                function (fileEntries) {
                    //--
                    var fileIndex = 0;

                    function onfileEntry() {
                        //--
                        if (fileIndex >= fileEntries.length) {
                            callback(null, null);
                            return;
                        }
                        var fileEntry = fileEntries[fileIndex++];
                        //fileEntry.remove(function () { onfileEntry(); }, errorHandler);
                        fileEntry.file(
                            function (data) {
                                callback(fileEntry.name, data);
                                onfileEntry();
                            },
                            errorHandler
                        );
                    }

                    // Load the first file entry
                    onfileEntry();
                },
                errorHandler
            );
        }

        //--
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onInitFS, errorHandler);
    };

    FileData.prototype.destroy = function (id, callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(false);
        }

        //--
        function onInitFS(fileSystem) {
            //--
            fileSystem.root.getFile(
                id,
                {},
                function (fileEntry) {
                    fileEntry.remove(function () { callback(true); }, errorHandler);
                },
                errorHandler
            );
        }

        //--
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onInitFS, errorHandler);
    };

    FileData.prototype.load = function (id, callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(null);
        }

        //--
        function onInitFS(fileSystem) {
            //--
            fileSystem.root.getFile(
                id,
                {},
                function (fileEntry) {
                    fileEntry.file(function (data) { callback(data); }, errorHandler);
                },
                errorHandler
            );
        }

        //--
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onInitFS, errorHandler);
    };

    FileData.prototype.save = function (blob, id, callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(null);
        }

        //--
        function onInitFS(fileSystem) {
            //--
            if (id == null) {
                id = new Date().valueOf();
            }

            //--
            fileSystem.root.getFile(
                id,
                { create: true },
                function (fileEntry) {
                    //--
                    fileEntry.createWriter(
                        function (fileWriter) {
                            fileWriter.onwriteend = function (event) {
                                callback(id);
                            };
                            fileWriter.onerror = errorHandler;
                            fileWriter.write(blob);
                        },
                        errorHandler
                    );
                },
                errorHandler
            );
        }

        //--
        if (navigator.webkitPersistentStorage) {
            navigator.webkitPersistentStorage.queryUsageAndQuota(
                function (used, total) {
                    //--
                    var quotaRequestSize = 0;
                    var free = total - used;
                    if (free < blob.size) {
                        quotaRequestSize = total + STORAGE_QUOTA_BASELINE;
                        console.log("quota used:" + used + ", current:" + total + ", requested:" + quotaRequestSize);
                    }
                    //--
                    navigator.webkitPersistentStorage.requestQuota(
                        quotaRequestSize,
                        function (grantedBytes) {
                            window.requestFileSystem(LocalFileSystem.PERSISTENT, grantedBytes, onInitFS, errorHandler);
                        },
                        errorHandler
                    );
                },
                errorHandler
            );
        } else {
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onInitFS, errorHandler);
        }
    };

    utils.FileData = FileData;
}());
