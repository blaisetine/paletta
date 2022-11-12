/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    var JSON_URL = 'https://dl.dropboxusercontent.com/u/74135594/Paletta/playback.json';

    //--
    var Playback = function (enabled) {
        //--
        this.enabled   = enabled;
        this.jsonObj   = null;
        this.autostart = false;
    };

    Playback.prototype.init = function () {
        //--
        var that = this;
        //--
        if (!this.enabled) {
            return;
        }
        //--
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) {
                that.jsonObj = JSON.parse(xhr.responseText);
                if (that.autostart) {
                    that.run();
                }
            }
        };
        xhr.open("GET", JSON_URL, true);
        xhr.send();
    };

    Playback.prototype.run = function () {
        //--
        if (this.jsonObj == null) {
            this.autostart = true;
            return;
        }
        //--
        var cmds = this.jsonObj.commands;
        for (var i = 0, n = cmds.length; i < n; ++i) {
            var cmd = cmds[i];
            switch (cmd.id) {
            case "newProject":
                app.device.newProject(cmd.canvasWidth, cmd.canvasHeight, cmd.bgColor);
                app.gallery.close();
                break;
            case "openProject":
                app.device.openProject(cmd.projectID, function () { app.gallery.close(); });
                break;
            case "setPaintTool":
                app.device.setPaintTool(cmd.paintTool);
                break;
            case "setBrushColor":
                app.device.setBrushColor(cmd.color);
                break;
            case "setBrushOpacity":
                app.device.setBrushOpacity(cmd.opacity);
                break;
            case "setBrushSize":
                app.device.setBrushSize(cmd.paintTool, cmd.size);
                break;
            case "cleanBrush":
                app.device.cleanBrush();
                break;
            case "beginStroke":
                app.device.beginStroke(cmd.pageX, cmd.pageY, cmd.pressure);
                break;
            case "moveStroke":
                app.device.moveStroke(cmd.pageX, cmd.pageY, cmd.pressure);
                break;
            case "endStroke":
                app.device.endStroke();
                break;
            case "updateTransform":
                var cvTransform = {tx: cmd.tx, ty: cmd.ty, s: cmd.s, r: cmd.r};
                app.device.updateTransform(cvTransform);
                break;
            case "drawImage":
                app.device.drawImage(cmd.url);
                break;
            }
        }
    };

    paletta.Playback = Playback;
}());
