/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

// Globals
var app = null;

(function () {
    'use strict';

    //--
    var POPUP_ZINDEX = 3;

    //--
    var Application = function () {
        //--
        this.settings     = new paletta.Settings();
        this.logger       = null;//new Worker('src/logger.js');
        this.playback     = new paletta.Playback(false);
        this.touch        = new utils.Touch();
        this.device       = new paletta.Device();
        this.toolbar      = new paletta.Toolbar();
        this.layerPanel   = new paletta.LayerPanel();
        this.colorPicker  = new paletta.ColorPicker();
        this.handTool     = new paletta.HandTool();
        this.history      = new paletta.History();
        this.dirtyRects   = new paletta.DirtyRects();
        this.eyeDropper   = new paletta.EyeDropper();
        this.facebook     = new paletta.Facebook();
        this.deviantArt   = new paletta.DeviantArt();
        this.dropbox      = new paletta.Dropbox();
        this.reference    = new paletta.Reference();

        if (window.requestFileSystem || window.webkitRequestFileSystem) {
            this.fileData = new utils.FileData();
        } else {
            this.fileData = new utils.FileDataDB("Paletta", "Projects");
        }

        this.gallery      = new paletta.Gallery();
        this.brushTool    = new paletta.BrushTool();
        this.pencilTool   = new paletta.PencilTool();
        this.eraserTool   = new paletta.EraserTool();
        this.eyeDropperTool = new paletta.EyeDropperTool();
        this.opacityTool  = new paletta.OpacityTool();
        this.cleanBrushTool = new paletta.CleanBrushTool();
        this.imageTool    = new paletta.ImageTool();
        this.historyPrev  = new paletta.HistoryPrev();
        this.historyNext  = new paletta.HistoryNext();        
        this.info         = new paletta.Info();

        this.popUpWindows = [];
        this.popUpWindowMaxZIndex = 0;
    };

    Application.prototype.start = function () {
        //--
        var that = this;

        //--
        this.initTrace();
        this.playback.init();

        //--
        this.facebook.init();
        this.deviantArt.init();
        this.dropbox.init();
        this.fileData.init();

        //--
        this.device.init();
        this.toolbar.init();
        this.eyeDropper.init();
        this.history.init();

        //--
        var startButton = document.getElementById('startButton');
        startButton.addEventListener('click', function (e) { that.toolbar.toggle(); }, false);

        //--
        window.addEventListener('resize', function () { that.onResize(); }, false);

        //--
        if (this.playback.enabled) {
            this.playback.run();
        }
    };

    Application.prototype.onResize = function () {
        //--
        this.toolbar.onResize();
    };

    Application.prototype.moveToTopWindow = function (popUpWindow) {
        //--
        if (popUpWindow.__zIndex == null) {
            // register the popup window
            var index = this.popUpWindows.length;
            popUpWindow.style.left = (index * 16) + 'px';
            popUpWindow.style.top = (index * 16) + 'px';
            var zIndex = POPUP_ZINDEX + index;
            popUpWindow.__zIndex = zIndex;
            popUpWindow.style.zIndex = zIndex;
            this.popUpWindowMaxZIndex = zIndex;
            this.popUpWindows.push(popUpWindow);
            return;
        }

        //--
        if (popUpWindow.__zIndex == this.popUpWindowMaxZIndex) {
            return;
        }
        //--
        var popUpWindows = this.popUpWindows;
        for (var i = 0, n = popUpWindows.length; i < n; ++i) {
            var w = popUpWindows[i];
            if (w.__zIndex > popUpWindow.__zIndex) {
                w.__zIndex -= 1;
                w.style.zIndex = w.__zIndex;
            }
        }
        popUpWindow.__zIndex = this.popUpWindowMaxZIndex;
        popUpWindow.style.zIndex = this.popUpWindowMaxZIndex;
    };

    Application.prototype.moveToBottomWindow = function (popUpWindow) {
        //--
        if (popUpWindow.__zIndex == POPUP_ZINDEX) {
            return;
        }
        //--
        var popUpWindows = this.popUpWindows;
        for (var i = 0, n = popUpWindows.length; i < n; ++i) {
            var w = popUpWindows[i];
            if (w.__zIndex < popUpWindow.__zIndex) {
                w.__zIndex += 1;
                w.style.zIndex = w.__zIndex;
            }
        }
        popUpWindow.__zIndex = POPUP_ZINDEX;
        popUpWindow.style.zIndex = POPUP_ZINDEX;
    };

    Application.prototype.initTrace = function () {
        //--
        var that = this;

        if (this.logger == null) {
            return;
        }

        //--
        this.logger.addEventListener('message', function (e) {
            var json = '{"title":"Playback","description":"Paletta playback file","commands":[\r\n'
            for (var i = 0, items = e.data, n = items.length - 1; i <= n; ++i) {
                json += items[i];
                if (i != n) {
                    json += ',';
                }
                json += '\r\n';
            }
            json += ']}';
            var blob = new Blob([json], {type: "application/json"});
            utils.saveAs(blob, "logger.json");
        }, false);

        //--
        var link = document.createElement("a");
        link.href = "#";
        link.innerHTML = "trace";
        link.setAttribute('style', 'position:absolute;bottom:0;right:0');
        link.onclick = function (e) {
            that.logger.postMessage({'cmd':'get'});
        };
        document.body.appendChild(link);
    };

    Application.prototype.trace = function (msg) {
        //--
        if (this.logger == null) {
            return;
        }
        this.logger.postMessage({'cmd':'put','msg':msg});
    };

    paletta.Application = Application;
}());

// Application entry point
function main() {
    //--
    app = new paletta.Application();

    //--
    if (window.PhoneGap) {
        document.addEventListener("deviceready", app.start(), false);
    } else {
        app.start();
    }
}
