/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var ImageTool = function () {
        //--
    };

    ImageTool.prototype.init = function () {
        //--
        var that = this;

        //--
        var fileInput = document.createElement('input');
        fileInput['id']     = "imageTool-file";
        fileInput['type']   = "file";
        fileInput['accept'] = "image/*";
        this.widget.button.appendChild(fileInput);

        //--
        var file = document.getElementById('imageTool-file');
        file.addEventListener('change', function (e) { that.__onLoadFromLocalDrive(e.target.files[0]); }, false);
    };

    ImageTool.prototype.open = function () {
        //--
        return false;
    };

    ImageTool.prototype.__onLoadFromLocalDrive = function (file) {
        //--
        var url = URL.createObjectURL(file);
        app.device.drawImage(url);

        app.device.autoColorPicker = app.device.colorBuffer;
    };

    paletta.ImageTool = ImageTool;
}());
