/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals = paletta.Globals;
    var TouchEvent = utils.TouchEvent;
    
    //--
    var SELECT_TIMEOUT = 500;  // 0.5 sec

    //--
    var Gallery = function () {
        //--
        this.gallery = null;
        this.title = null;
        this.save = null;
        this.overlay = null;
        this.mainframe = null;
        this.files = null;
        this.menuNew = null;
        this.menuEdit = null;
        this.menuExport = null;
        this.active_menu = null;
        this.newProjBgColor = null;
        this.newProjWidth = null;
        this.newProjHeight = null;
        this.selected_project = null;
        this.projectLoaded = false;
        this.active_project = null;
        this.touchHoldTimeoutID = null;
        this.menuVisible = false;
    };

    Gallery.prototype.init = function () {
        //--
        var that = this;

        //--
        this.gallery = document.getElementById('gallery');
        this.title = document.getElementById('gallery-title');
        this.save = document.getElementById('save');
        this.mainframe = document.getElementById('mainframe');
        this.overlay = document.getElementById('dialog-overlay');

        //--
        var saveYesButton = document.getElementById('save-yes-btn');
        saveYesButton.addEventListener('click', function (event) { that.__saveYes(); }, false);

        //--
        var saveNoButton = document.getElementById('save-no-btn');
        saveNoButton.addEventListener('click', function (event) { that.__saveClose(); }, false);

        //--
        var saveCloseButton = document.getElementById('save-close');
        saveCloseButton.addEventListener('click', function (event) { that.__saveClose(); }, false);

        //--
        var createButton = document.getElementById('gallery-create-btn');
        createButton.addEventListener('click', function (event) { that.__newProject(); }, false);

        //--
        var openButton = document.getElementById('gallery-open-btn');
        openButton.addEventListener('click', function (event) { that.__openProject(); }, false);

        //--
        var deleteButton = document.getElementById('gallery-delete-btn');
        deleteButton.addEventListener('click', function (event) { that.__delete(); }, false);

        //--
        var openButton = document.getElementById('gallery-export-btn');
        openButton.addEventListener('click', function (event) { that.__export(); }, false);

        //--
        var devianartButton = document.getElementById('gallery-export-devianart-btn');
        devianartButton.addEventListener('click', function () { that.__saveToDevianArt(); }, false);

        //--
        var facebookButton = document.getElementById('gallery-export-facebook-btn');
        facebookButton.addEventListener('click', function () { that.__saveToFacebook(); }, false);

        //--
        var dropboxButton = document.getElementById('gallery-export-dropbox-btn');
        dropboxButton.addEventListener('click', function () { that.__saveToDropbox(); }, false);

        //--
        var galleryButton = document.getElementById('gallery-export-gallery-btn');
        galleryButton.addEventListener('click', function () { that.__saveToGallery(); }, false);

        //--
        this.menuNew  = document.getElementById('gallery-new');
        this.menuEdit = document.getElementById('gallery-edit');
        this.menuExport = document.getElementById('gallery-export');
        this.newProjBgColor = document.getElementById('gallery-color');
        this.newProjWidth   = document.getElementById('gallery-width');
        this.newProjHeight  = document.getElementById('gallery-height');

        //--
        this.newProjBgColor.value = utils.rgb2hex(Globals.DEFAULT_CANVAS_COLOR);
        this.newProjWidth.value   = Math.min(window.innerWidth, Globals.MAX_CANVAS_WIDTH);
        this.newProjHeight.value  = Math.min(window.innerHeight, Globals.MAX_CANVAS_HEIGHT);

        //--
        this.files = document.getElementById('gallery-files');
        app.touch.attach(this.files, TouchEvent.ALL, function (event) { that.__onThumbNailTouch(event); });

        //--
        this.__makeProjectFile(null, null, null, null, null, 0, 0);

        //--
        app.fileData.getFiles(function (id, data) { that.__displayFile(id, data); });
    };

    Gallery.prototype.open = function () {
        //--
        this.mainframe.style.display = 'none';
        this.gallery.style.display = 'block';
        //--
        if (!app.device.toggleSaved()) {
            this.__save();
        }
        return false;
    };

    Gallery.prototype.close = function () {
        //--
        this.__onSelectProject(null);

        //--
        this.gallery.style.display = 'none';
        this.mainframe.style.display = 'block';

        //--
        app.toolbar.firstUse();
    };

    Gallery.prototype.__makeProjectFile = function (project, id, name, imgURL, date, width, height) {
        //--
        var thumb;
        var img;

        //--
        if (id) {
            thumb = document.createElement('div');
            thumb.className = 'fileItem';

            img = document.createElement('div');
            img.style.backgroundImage = 'url(' + imgURL + ')';
            img.className = 'img';
            thumb.appendChild(img);

            var desc = document.createElement('p');
            desc.innerHTML = name + '<br> ' + date + '<br>' + width + 'x'+ height;
            thumb.appendChild(desc);
        } else {
            thumb = document.getElementById('gallery-files-newProject');
            img = thumb.getElementsByClassName('img')[0];
        }

        //--
        if (project) {
            project.id     = id;
            project.name   = name;
            project.date   = date;
            project.width  = width;
            project.height = height;
            project.thumb  = thumb;
            project.img    = img;
        } else {
            project = { id:id, name:name, date:date, width:width, height:height, thumb:thumb, img:img};
        }

        img.__project = project;

        return project;
    };

    Gallery.prototype.__displayFile = function (id, data) {
        //--
        var that = this;

        //--
        if (id == null) {
            return;
        }

        function getFileInfo(info) {
            //--
            if (info == null) {
                return;
            }
            //--
            var project = that.__makeProjectFile(null, id, info.name, info.url, info.date.toLocaleDateString(), info.width, info.height);
            that.files.appendChild(project.thumb);
        }

        //--
        app.device.readStorageInfo(data, getFileInfo);
    };

    Gallery.prototype.__onTouchHold = function (event) {
        //--
        var that = this;

        //--
        this.touchHoldTimeoutID = null;

        //--
        function __webkitTransitionEndHandler(event) {
            event.target.removeEventListener("webkitTransitionEnd", __webkitTransitionEndHandler, false);
        }
        this.files.addEventListener("webkitTransitionEnd", __webkitTransitionEndHandler, false);
        window.setTimeout(function () {that.files.classList.add('files-slidedown');}, 0);
        this.menuVisible = true;
    };

    Gallery.prototype.__onSelectProject = function (project) {
        //--
        if (this.selected_project) {
            this.selected_project.img.style.border = null;
        }
        if (this.active_menu) {
            this.active_menu.style.display = 'none';
        }
        if (project) {
            project.img.style.border = '1px solid yellow';
            if (project.id) {
                if ((this.selected_project == null) ||
                    (this.selected_project.id != project.id)) {
                    this.projectLoaded = false;
                }
                this.active_project = project;
                this.active_menu = this.menuEdit;
            } else {
                this.active_project = null;
                this.active_menu = this.menuNew;
            }
            this.active_menu.style.display = 'block';
        } else {
            //--
            this.files.classList.remove('files-slidedown');
            this.menuVisible = false;
            //--
            this.menuNew.style.display = 'none';
            this.menuEdit.style.display = 'none';
        }
        this.selected_project = project;
    };

    Gallery.prototype.__onThumbNailTouch = function (event) {
        //--
        var that = this;

        //--
        var project = event.target.__project;
        if (project == null) {
            return;
        }
        
        //--
        if (this.touchHoldTimeoutID) {
            window.clearTimeout(this.touchHoldTimeoutID);
            this.touchHoldTimeoutID = null;
        }

        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            this.__onSelectProject(project);
            
            //--
            if (!this.menuVisible) {
                this.touchHoldTimeoutID = window.setTimeout(function () { that.__onTouchHold(); }, SELECT_TIMEOUT);
            }
            break;
        case TouchEvent.END:
            //--
            if (!this.menuVisible) {
                if (project.id) {
                    this.__openProject();
                } else {
                    this.__newProject();
                }
            }
            break;
        }
    };

    Gallery.prototype.__openProject = function () {
        //--
        var that = this;

        //--
        this.__loadProject(function () { that.close(); });
    };

    Gallery.prototype.__newProject = function () {
        //--
        var width  = Math.min(Math.max(this.newProjWidth.value, Globals.MIN_CANVAS_WIDTH), Globals.MAX_CANVAS_WIDTH);
        var height = Math.min(Math.max(this.newProjHeight.value, Globals.MIN_CANVAS_HEIGHT), Globals.MAX_CANVAS_HEIGHT);
        var color  = 0xff000000 | utils.hex2rgb(this.newProjBgColor.value);
        app.device.newProject(width, height, color);

        //--
        this.close();
    };

    Gallery.prototype.__save = function () {
        //--
        var saveName = document.getElementById('save-name');
        saveName.value = this.active_project ? this.active_project.name : 'untitled';
        this.overlay.style.display = 'block';
        this.save.style.display = 'block';
    };

    Gallery.prototype.__saveYes = function () {
        //--
        var that = this;

        //--
        var saveName = document.getElementById('save-name');
        var projectName = saveName.value;
        if (projectName == "") {
            projectName = 'untitled';
        }

        //--
        var data = app.device.createStorageData(projectName);

        //--
        function saveCallback(id) {
            //--
            function getFileInfo(info) {
                //--
                if (info) {
                    //--
                    var activeThumb = that.active_project ? that.active_project.thumb : null;
                    var project = that.__makeProjectFile(
                        that.active_project,
                        id,
                        projectName,
                        info.url,
                        info.date.toLocaleDateString(),
                        info.width,
                        info.height);
                    //--
                    if (activeThumb) {
                        that.files.replaceChild(project.thumb, activeThumb);
                    } else {
                        that.files.insertBefore(project.thumb, that.files.firstChild.nextSibling);
                    }
                    //--
                    that.active_project = project;
                }
                that.__saveClose();
            }

            if (id) {
                app.device.readStorageInfo(data, getFileInfo);
            } else {
                that.__saveClose();
            }
        }

        //--
        var projectId = (this.active_project) ? this.active_project.id : null;
        app.fileData.save(data, projectId, saveCallback);
    };

    Gallery.prototype.__saveClose = function () {
        //--
        this.save.style.display = 'none';
        this.overlay.style.display = 'none';
    };

    Gallery.prototype.__delete = function () {
        //--
        var that = this;

        //--
        function deleteCallback(result) {
            if (result) {
                that.files.removeChild(that.selected_project.thumb);
                that.__onSelectProject(null);
            }
        }

        //--
        app.fileData.destroy(this.selected_project.id, deleteCallback);
    };

    Gallery.prototype.__loadProject = function (callback) {
        //--
        var that = this;

        //--
        function onLoadComplete(result) {
            //--
            if (result) {
                that.projectLoaded = true;
                callback();
            }
        }

        if (!this.projectLoaded) {
            //--
            app.device.openProject(this.active_project.id, onLoadComplete);
        } else {
            callback();
        }
    };

    Gallery.prototype.__export = function () {
        //--
        if (this.active_menu) {
            this.active_menu.style.display = 'none';
        }
        this.active_menu = this.menuExport;
        this.active_menu.style.display = 'block';
    };

    Gallery.prototype.__saveToDevianArt = function () {
        //--
        var that = this;

        //--
        this.__loadProject(function () {
            //--
            var deviantArt = app.deviantArt;
            var canvas = app.device.getCanvas();

            //--
            var url = canvas.toDataURL('image/png');
            var filename = new Date().valueOf() + '.png';
            deviantArt.save(filename, that.active_project.name, url);
        });
    };

    Gallery.prototype.__saveToFacebook = function () {
        //--
        var that = this;

        //--
        this.__loadProject(function () {
            //--
            var facebook = app.facebook;
            var canvas = app.device.getCanvas();

            //--
            var url = canvas.toDataURL('image/png');
            var filename = new Date().valueOf() + '.png';
            facebook.save(filename, that.active_project.name, url);
        });
    };

    Gallery.prototype.__saveToDropbox = function () {
        //--
        this.__loadProject(function () {
            //--
            var dropbox = app.dropbox;
            var canvas = app.device.getCanvas();

            //--
            var url = canvas.toDataURL('image/png');
            var filename = new Date().valueOf() + '.png';
            dropbox.save(filename, url);
        });
    };

    Gallery.prototype.__saveToGallery = function () {
        //--
        this.__loadProject(function () {
            //--
            var dropbox = app.dropbox;
            var canvas = app.device.getCanvas();

            //--
            var url  = canvas.toDataURL('image/png');
            var blob = utils.dataURItoBlob(url);
            var filename = new Date().valueOf() + '.png';
            utils.saveAs(blob, filename);
        });
    };

    paletta.Gallery = Gallery;
}());
