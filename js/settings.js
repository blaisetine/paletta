/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';
    
    var Globals = {        
        MAX_CANVAS_WIDTH:       2048,
        MAX_CANVAS_HEIGHT:      2048,
        MIN_CANVAS_WIDTH:       64,
        MIN_CANVAS_HEIGHT:      64,
        DEFAULT_CANVAS_COLOR:   0xffffff, // white
        MAX_BRUSH_SIZE:         64,                
        DEFAULT_BRUSH_SIZE:     24,
        DEFAULT_PENCIL_SIZE:    4,
        DEFAULT_ERASER_SIZE:    32,
        DEFAULT_BRUSH_LOAD:     1638, // in fixed-point 16.16 format
        DEFAULT_BRUSH_COLOR:    0x000000, // black
        EYEDROPPER_TIMEOUT:     1000,  // 1 sec
        GALLERY_THUMBNAIL_SIZE: 150,
        MAX_BRUSH_LEVELS:       256,  // brush pressure levels   
    };

    //--
    var Settings = function () {
        //--
    };

    Settings.prototype.init = function () {
        //--
    };

    Settings.prototype.open = function () {
        //--
        return false;
    };   

    paletta.Globals  = Globals;
    paletta.Settings = Settings;
}());
