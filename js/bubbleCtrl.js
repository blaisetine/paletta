/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals = paletta.Globals;
    var TouchEvent = utils.TouchEvent;

    //--
    var BubbleCtrl = function (scaleValue, offsetValue, maxValue) {
        //--
        this.scaleValue  = scaleValue;
        this.offsetValue = offsetValue;
        this.maxValue    = maxValue;
        //--
        this.ctrl = null;
        this.orig_bgcolor = null;
        //--
        this.handlerCB  = null;
        this.getValueCB = null;
        this.setValueCB = null;
        this.displayCB  = null;
        //--
        this.button = null;
        this.originalValue = null;
        this.currentValue  = null;
        this.prevPos = {x:0, y:0};
    };

    BubbleCtrl.prototype.init = function (handlerCB, getValueCB, setValueCB, displayCB) {
        //--
        this.ctrl = document.getElementById('startButton');
        this.handlerCB  = handlerCB;
        this.getValueCB = getValueCB;
        this.setValueCB = setValueCB;
        this.displayCB  = displayCB;
    };

    BubbleCtrl.prototype.onTouch = function (event) {
        //--
        var that = this;

        //
        this.originalValue = this.getValueCB();

        //--
        this.button = event.target;

        //--
        this.orig_bgcolor = this.ctrl.style.backgroundColor;
        this.ctrl.style.backgroundColor = '#fff'
        this.ctrl.innerHTML = this.originalValue;

        //--
        this.handlerCB(function (event) {that.__onTouch(event);});
    };

    BubbleCtrl.prototype.onClick = function (event) {
        //--
        var that = this;

        //--
        this.orig_bgcolor = this.ctrl.style.backgroundColor;
        this.ctrl.style.backgroundColor = '#fff'
        this.ctrl.innerHTML  = this.getValueCB();

        //--
        window.setTimeout(function () {
            that.ctrl.innerHTML = '';
            that.ctrl.style.backgroundColor = that.orig_bgcolor;
        }, 300);
    };

    BubbleCtrl.prototype.__onTouch = function (event) {
        //--
        switch (event.etype) {
        case TouchEvent.MOVE:
            //--
            var pageX = event.touches[0].pageX;
            var pageY = event.touches[0].pageY;
            var target = document.elementFromPoint(event.touches[0].pageX, event.touches[0].pageY);
            if (target == this.button) {
                this.prevPos.x = pageX;
                this.prevPos.y = pageY;
                this.currentValue = this.originalValue;
            } else {
                var x = this.prevPos.x - pageX;
                var y = this.prevPos.y - pageY;
                var length = Math.sqrt(x * x + y * y);
                this.currentValue = Math.min(Math.floor(length * this.scaleValue + this.offsetValue), this.maxValue);
            }
            this.ctrl.innerHTML = this.currentValue;
            if (this.displayValueCB != null) {
                this.displayValueCB(this.currentValue);
            }
            break;
        case TouchEvent.END:
            //--
            if (this.currentValue != this.originalValue) {
                this.setValueCB(this.currentValue);
            }
        case TouchEvent.CANCEL:
            //--
            this.ctrl.innerHTML = '';
            this.ctrl.style.backgroundColor = this.orig_bgcolor;
            this.handlerCB(null);
            break;
        }
    };

    paletta.BubbleCtrl = BubbleCtrl;
}());
