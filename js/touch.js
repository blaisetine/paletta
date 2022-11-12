/* Copyright 2014, Blaise Tine. */

var utils = utils || {};

(function () {
    'use strict';

    //--
    var TouchEvent = {
        START:  0x01,
        MOVE:   0x02,
        END:    0x04,
        CANCEL: 0x08,
        ALL:    0xf,
    };

    var InputType = {
        NONE:    0x0,
        TOUCH:   0x1,
        POINTER: 0x2,
    };

    var TouchInput = function () {
        //--
        var that = this;

        //--
        this.inputType = InputType.NONE;
        this.isTouchClick = false;
        this.activeListeners = [];
        this.numListeners = 0;
        this.pageX = 0;
        this.pageY = 0;
        this.pressure = null;

        //--
        this.wtPlugin = document.getElementById('wtPlugin');

        //--
        if (window.PointerEvent) {
            this.eventType = { down:'pointerdown', move:'pointermove', up:'pointerup' };
            document.addEventListener("MSHoldVisual", function (e) { e.preventDefault(); }, false);
            document.addEventListener("contextmenu", function (e) { e.preventDefault(); }, false);
            document.addEventListener("selectstart", function (e) { e.preventDefault(); }, false);
        } else {
            this.eventType = { down:'mousedown', move:'mousemove', up:'mouseup' };
        }

        //--
        this.touchCall = function (type, event, callback) {
            event.etype = type;
            callback(event);
        }

        //--
        this.pointerCall = function (type, event, callback) {
            event.etype = type;            
            var force = null;
            if (this.wtPlugin) {
                force = this.wtPlugin.penAPI.pressure;
            } else if (window.PointerEvent) {
                force = event.pressure;
            }
            event.touches = [{pageX:event.pageX, pageY:event.pageY, force:force}];
            callback(event);
        };

        //--
        this.pointerMoveHandler = function (event) {
            //console.log("mouse("+event.pageX+","+event.pageY+")");
            if (that.inputType != InputType.POINTER)
                return;

            //--
            if ((event.pageX == that.pageX)
             && (event.pageY == that.pageY)
             && (event.pressure == that.pressure)) {
                // Skip if the cursor position and pressure did not change
                return;
            }
            that.pageX = event.pageX;
            that.pageY = event.pageY;
            //--
            var activeListeners = that.activeListeners;
            for (var i = 0, n = activeListeners.length; i < n; ++i) {
                var listener = activeListeners[i];
                if (listener.__touchmove) {
                    //console.log(that.eventType.move);
                    that.pointerCall(TouchEvent.MOVE, event, listener.__touchmove);
                }
            }
        };

        //--
        this.pointerUpHandler = function (event) {
            //--
            if (that.inputType != InputType.POINTER)
                return;

            that.inputType = InputType.NONE;
            //--
            var activeListeners = that.activeListeners;
            var listener = activeListeners.pop();
            while (listener) {
                //--
                if (listener.__touchend) {
                    //console.log(that.eventType.up);
                    that.pointerCall(TouchEvent.END, event, listener.__touchend);
                }
                //--
                listener = activeListeners.pop();
            }
        };
    };

    TouchInput.prototype.attach = function (object, flags, callback) {
        //--
        var that = this;

        // initialize callbacks
        if (object.__touch_flags == null) {

            //
            // register pointer events
            //

            object.__pointerdown_handler = function (event) {
                //--
                if (that.inputType != InputType.NONE)
                    return;

                if (that.isTouchClick) {
                    that.isTouchClick = false;  // skip touch related mouse events
                    return;
                }

                that.inputType = InputType.POINTER;

                //--
                if (object.__touchstart) {
                    //console.log(that.eventType.down);
                    that.pointerCall(TouchEvent.START, event, object.__touchstart);
                }
                //--
                that.activeListeners.push(object);
                that.pageX = event.pageX;
                that.pageY = event.pageY;
                that.pressure = event.pressure;
            };
            object.addEventListener(this.eventType.down, object.__pointerdown_handler, false);

            if (0 == this.numListeners++) {
                // register pointer handler
                document.addEventListener(this.eventType.move, this.pointerMoveHandler, false);
                document.addEventListener(this.eventType.up, this.pointerUpHandler, false);
            }

            //
            // register touch events
            //

            object.__touchstart_handler = function (event) {
                //console.log(event.type);
                if (that.inputType != InputType.NONE)
                    return;

                that.inputType = InputType.TOUCH;
                that.isTouchClick = true;
                if (object.__touchstart) {
                    that.touchCall(TouchEvent.START, event, object.__touchstart);
                }
            };
            object.addEventListener('touchstart', object.__touchstart_handler, false);

            object.__touchmove_handler = function (event) {
                //console.log(event.type);
                if (that.inputType != InputType.TOUCH)
                    return;

                that.isTouchClick = false;
                if (object.__touchmove) {
                    that.touchCall(TouchEvent.MOVE, event, object.__touchmove);
                }
                event.preventDefault();
            };
            object.addEventListener('touchmove', object.__touchmove_handler, false);

            object.__touchend_handler = function (event) {
                //console.log(event.type);
                if (that.inputType != InputType.TOUCH)
                    return;

                that.inputType = InputType.NONE;
                if (object.__touchend) {
                    that.touchCall(TouchEvent.END, event, object.__touchend);
                }
            };
            object.addEventListener('touchend', object.__touchend_handler, false);

            object.__touchcancel_handler = function (event) {
                //console.log(event.type);
                if (that.inputType != InputType.TOUCH)
                    return;

                that.inputType = InputType.NONE;
                if (object.__touchcancel) {
                    that.touchCall(TouchEvent.CANCEL, event, object.__touchcancel);
                }
            };
            object.addEventListener('touchcancel', object.__touchcancel_handler, false);

            //--
            object.__touch_flags = 0;
        }

        // register callbacks
        if (flags & TouchEvent.START) {
            object.__touchstart = callback;
        }
        if (flags & TouchEvent.MOVE) {
            object.__touchmove = callback;
        }
        if (flags & TouchEvent.END) {
            object.__touchend = callback;
        }
        if (flags & TouchEvent.CANCEL) {
            object.__touchcancel = callback;
        }
        object.__touch_flags |= flags;
    };

    TouchInput.prototype.detach = function (object, flags) {
        //--
        if (flags & TouchEvent.START) {
            object.__touchstart = null;
        }
        if (flags & TouchEvent.MOVE) {
            object.__touchmove = null;
        }
        if (flags & TouchEvent.END) {
            object.__touchend = null;
        }
        if (flags & TouchEvent.CANCEL) {
            object.__touchcancel = null;
        }
        //--
        console.assert(object.__touch_flags != 0);
        object.__touch_flags &= ~flags;
        //--
        if (object.__touch_flags == 0) {
            //--
            object.removeEventListener(this.eventType.down, object.__pointerdown_handler, false);
            object.removeEventListener('touchstart', object.__touchstart_handler, false);
            object.removeEventListener('touchmove', object.__touchmove_handler, false);
            object.removeEventListener('touchend', object.__touchend_handler, false);
            object.removeEventListener('touchcancel', object.__touchcancel_handler, false);
            object.__pointerdown_handler = null;
            object.__touchstart_handler  = null;
            object.__touchmove_handler   = null;
            object.__touchend_handler    = null;
            object.__touchcancel_handler = null;

            // unregister pointer handler
            console.assert(this.numListeners > 0);
            if (0 == --this.numListeners) {
                object.removeEventListener(this.eventType.move, this.pointerMoveHandler, false);
                document.removeEventListener(this.eventType.up, this.pointerUpHandler, false);
            }
            object.__touch_flags = null;
        }
    };

    utils.Touch = TouchInput;
    utils.TouchEvent = TouchEvent;
}());
