/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals = paletta.Globals;
    var TouchEvent = utils.TouchEvent;

    //--
    var EYEDROPPER_SCALE = 4;
    var EYEDROPPER_RADIUS = 50;

    var EyeDropper = function () {
        //--
        this.eyeDropper = null;
        this.target = null;
        this.color = 0;
        this.autoClose = false;
        this.enabled = false;
    };

    EyeDropper.prototype.init = function () {
        //--
        this.eyeDropper = document.getElementById('eyeDropper');
    };

    EyeDropper.prototype.bind = function (target, touchPos) {
        //--
        var that = this;

        //--
        if (this.target) {
            this.unbind();
        }

        //--
        this.target = target;

        //--
        target.setInputCallback(function (event) {that.onTouch(event);});

        //--
        var canvas = target.canvas;
        this.eyeDropper.style.backgroundImage = 'url(' + canvas.toDataURL() + ')';
        this.eyeDropper.style.backgroundSize = canvas.width * EYEDROPPER_SCALE + 'px ' + canvas.height * EYEDROPPER_SCALE + 'px';
        this.eyeDropper.style.webkitTransform = "rotate(" + target.cvTransform.r + "rad)";

        //--
        if (touchPos) {
            this.__draw(touchPos);
        }
    };

    EyeDropper.prototype.unbind = function () {
        //--
        this.target.setInputCallback(null);
        this.target = null;
    };

    EyeDropper.prototype.open = function (autoClose) {
        //--
        this.autoClose = autoClose;
        this.enabled = true;
    };

    EyeDropper.prototype.close = function () {
        //--
        if (this.target) {
            this.unbind();
        }
        this.enabled = false;
    };

    EyeDropper.prototype.__draw = function (touchPos) {
        //--
        var coords = this.target.toCanvasCoords(touchPos.pageX, touchPos.pageY);
        var left = touchPos.pageX - EYEDROPPER_RADIUS;
        var top = touchPos.pageY - EYEDROPPER_RADIUS;
        var bgOffsetX = EYEDROPPER_RADIUS - EYEDROPPER_SCALE * coords.x;
        var bgOffsetY = EYEDROPPER_RADIUS - EYEDROPPER_SCALE * coords.y;

        //--
        var color = this.target.getPixelColor(coords.x, coords.y);
        //console.log("eyeDropper("+coords.x+","+coords.y+")="+utils.rgb2hex(color));
        this.color = color;

        //--
        var colorR = (color >> 16) & 0xff;
        var colorG = (color >> 8) & 0xff;
        var colorB = color & 0xff;

        //--
        var eyeDropper = this.eyeDropper;
        eyeDropper.style.display = 'none';
        eyeDropper.style.backgroundPosition = 'left ' + bgOffsetX + 'px top ' + bgOffsetY + 'px';
        eyeDropper.style.left = left + 'px';
        eyeDropper.style.top = top + 'px';
        eyeDropper.style['-webkit-box-shadow'] = '0 0 0 7px rgba('+colorR+','+colorG+','+colorB+',0.85), 0 0 7px 7px rgba(0,0,0,0.25), inset 0 0 40px 2px rgba(0,0,0,0.25)';
        eyeDropper.style.display = 'block';
    };

    EyeDropper.prototype.onTouch = function (event) {
        //--
        switch (event.etype) {
        case TouchEvent.START:
        case TouchEvent.MOVE:
            this.__draw(event.touches[0]);
            break;
        case TouchEvent.END:
        case TouchEvent.CANCEL:
            this.eyeDropper.style.display = 'none';
            app.colorPicker.setColor(this.color);
            if (this.autoClose) {
                this.close();
            }
            break;
        }
        event.stopPropagation();
    };

    paletta.EyeDropper = EyeDropper;
}());
