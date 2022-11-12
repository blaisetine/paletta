/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals = paletta.Globals;
    var TouchEvent = utils.TouchEvent;

    //--
    var SCALE_MAX   = 4.0;
    var SCALE_MIN   = 0.25;
    var SCALE_DELTA = 0.05;

    var HandTool = function () {
        //--
        var that = this;

        //--
        paletta.PaintToolBase.call(this, paletta.PaintTool.HANDTOOL);

        //--
        this.target = null;
        this.prevPosition = {x:0, y:0};
        this.cvTransform = null;
        this.distance = 0.0;
        this.transformMode = null;
        this.enabled = false;
        this.mousewheel = null;
        this.keydown = null;
        this.keyup = null;
        this.rotateKey = false;
        this.keydownRotate = false;

        //--
        this.mousewheel = function (event) {
            var dir = (event.wheelDelta > 0) ? 1.0 : -1.0;
            if (that.rotateKey) {
                //--
                that.gesture(1.0, dir * (Math.PI / 36));
            } else {
                //--
                var scale = 1.0 + dir * SCALE_DELTA;
                that.gesture(scale, 0.0);
            }
        };

        //--
        this.keydown = function (event) {
            if (event.keyCode == "82") {
                that.rotateKey = true;
            }
        };

        //--
        this.keyup = function (event) {
            if (event.keyCode == "82") {
                that.rotateKey = false;
            }
        };
    };

    HandTool.prototype = new paletta.PaintToolBase();
    HandTool.prototype.constructor = HandTool;

    HandTool.prototype.init = function () {
        //--
    };

    HandTool.prototype.bind = function (target) {
        //--
        var that = this;

        //--
        if (this.target) {
            this.unbind();
        }

        //--
        this.target = target;
        this.cvTransform = target.cvTransform;

        //--
        target.setInputCallback(function (event) {that.onTouch(event);});

        //--
        target.canvas.className = "canvas_move";

        //--
        target.canvas.addEventListener("mousewheel", this.mousewheel, false);
        window.addEventListener("keydown", this.keydown, false);
        window.addEventListener("keyup", this.keyup, false);
    };

    HandTool.prototype.unbind = function () {
        //--
        this.target.canvas.removeEventListener("mousewheel", this.mousewheel, false);
        window.removeEventListener("keydown", this.keydown, false);
        window.removeEventListener("keydown", this.keyup, false);

        //--
        this.target.canvas.className = "canvas_draw";
        this.target.setInputCallback(null);
        this.target = null;
    };

    HandTool.prototype.open = function () {
        //--
        app.toolbar.selectPaintTool(this.paintTool);

        //--
        this.enabled = true;

        return false;
    };

    HandTool.prototype.close = function () {
        //--
        if (this.target) {
            this.unbind();
        }
        //--
        this.enabled = false;
    };

    HandTool.prototype.drag = function (deltaX, deltaY) {
        //--
        this.cvTransform.tx += deltaX;
        this.cvTransform.ty += deltaY;
        //--
        this.target.updateTransform(this.cvTransform);
   };

    HandTool.prototype.gesture = function (scale, rotation) {
        //--
        this.cvTransform.s = Math.min(Math.max(this.cvTransform.s * scale, SCALE_MIN), SCALE_MAX);
        this.cvTransform.r += rotation;
        //--
        this.target.updateTransform(this.cvTransform);
    };

    HandTool.prototype.onTouch = function (event) {
        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            if (event.touches.length == 1) {
                //--
                this.prevPosition.x = event.touches[0].pageX;
                this.prevPosition.y = event.touches[0].pageY;
                this.transformMode = 'drag';
            } else if (event.touches.length == 2) {
                //--
                this.distance = utils.distance(
                    event.touches[0].pageX, event.touches[0].pageY,
                    event.touches[1].pageX, event.touches[1].pageY
                );
                this.angle = utils.angle(
                    event.touches[0].pageX, event.touches[0].pageY,
                    event.touches[1].pageX, event.touches[1].pageY
                );
                this.transformMode = 'gesture';
            } else {
                this.transformMode = null;
            }
            break;
        case TouchEvent.MOVE:
            //--
            if (this.transformMode == 'drag') {
                //--
                var deltaX = event.touches[0].pageX - this.prevPosition.x;
                var deltaY = event.touches[0].pageY - this.prevPosition.y;
                this.prevPosition.x = event.touches[0].pageX;
                this.prevPosition.y = event.touches[0].pageY;
                //--
                this.drag(deltaX, deltaY);
            } else if (this.transformMode == 'gesture') {
                //--
                var distance = utils.distance(
                    event.touches[0].pageX, event.touches[0].pageY,
                    event.touches[1].pageX, event.touches[1].pageY
                );
                var angle = utils.angle(
                    event.touches[0].pageX, event.touches[0].pageY,
                    event.touches[1].pageX, event.touches[1].pageY
                );
                //--
                this.gesture(distance / this.distance, angle - this.angle);
                this.distance = distance;
                this.angle = angle;
            } else {
                return;
            }
            break;
        case TouchEvent.END:
        case TouchEvent.CANCEL:
            this.transformMode = null;
            break;
        }
        event.stopPropagation();
    };

    paletta.HandTool = HandTool;
}());
