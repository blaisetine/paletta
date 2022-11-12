/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals = paletta.Globals;
    var TouchEvent = utils.TouchEvent;

    var ColorPicker = function () {
        //--
        this.colorPicker = null;
        this.valuePanel  = null;
        this.valueKnob   = null;
        this.huePanel    = null;
        this.hueKnob     = null;
        this.colorR      = null;
        this.colorG      = null;
        this.colorB      = null;
        this.startButton = null;
        this.colorsTab   = null;
        this.swatchesTab = null;
        this.colors      = null;
        this.swatches    = null;
        this.closeButton = null;

        //--
        this.valuePanelPos = null;
        this.huePanelPos = null;

        //--
        this.colorHSV = null;

        //--
        this.prevPos = {x:0, y:0};
        this.panelPositionChanged = true;
    };

    ColorPicker.prototype.init = function () {
        var that = this;

        //--
        this.colorPicker = document.getElementById('colorPicker');
        this.valuePanel  = document.getElementById('colorPicker-valuePanel');
        this.valueKnob   = document.getElementById('colorPicker-valueKnob');
        this.huePanel    = document.getElementById('colorPicker-huePanel');
        this.hueKnob     = document.getElementById('colorPicker-hueKnob');
        this.colorR      = document.getElementById('colorPicker-colorR');
        this.colorG      = document.getElementById('colorPicker-colorG');
        this.colorB      = document.getElementById('colorPicker-colorB');
        this.startButton = document.getElementById('startButton');
        this.colorsTab   = document.getElementById('colorPicker-tabs-colors');
        this.swatchesTab = document.getElementById('colorPicker-tabs-swatches');
        this.colors      = document.getElementById('colorPicker-colors');
        this.swatches    = document.getElementById('colorPicker-swatches');
        this.closeButton = document.getElementById('colorPicker-close');

        //--
        function __onColorChangeHandler(event) {
            var rgb = (that.colorR.value << 16) | (that.colorG.value << 8) | that.colorB.value;
            that.__setColor(rgb, false);
        }
        this.colorR.addEventListener('change', __onColorChangeHandler, false);
        this.colorG.addEventListener('change', __onColorChangeHandler, false);
        this.colorB.addEventListener('change', __onColorChangeHandler, false);

        //--
        this.closeButton.addEventListener('click', function (event) { app.toolbar.close(that); }, false);

        //--
        this.colorsTab.addEventListener('click',
            function (event) {
                that.swatchesTab.className  = null;
                that.swatches.style.display = 'none';
                that.colorsTab.className    = 'selected';
                that.colors.style.display   = 'block';
            }, false);

        //--
        this.swatchesTab.addEventListener('click',
            function (event) {
                that.colorsTab.className    = null;
                that.colors.style.display   = 'none';
                that.swatchesTab.className  = 'selected';
                that.swatches.style.display = 'block';
            }, false);

        //--
        this.swatches.addEventListener('click',
            function (event) {
                that.onClickSwatches(event);
            }, false);

        //--
        for (var j = 0; j < 8; ++j) {
            for (var i = 0; i < 8; ++i) {
                var div = document.createElement('div');
                div.className = 'swatch';
                this.swatches.appendChild(div);
            }
        }

        //--
        app.touch.attach(this.colorPicker, TouchEvent.START | TouchEvent.MOVE, function (event) {that.onTouchWindow(event);});
        app.touch.attach(this.valuePanel, TouchEvent.ALL, function (event) {that.onTouchValue(event);});
        app.touch.attach(this.huePanel, TouchEvent.ALL, function (event) {that.onTouchHue(event);});
    };

    ColorPicker.prototype.open = function () {
        //--
        app.moveToTopWindow(this.colorPicker);
        this.setColor(app.device.getBrushColor());
        this.colorPicker.style.display = 'block';
        return true;
    };

    ColorPicker.prototype.close = function () {
        //--
        this.colorPicker.style.display = 'none';
        app.moveToBottomWindow(this.colorPicker);
    };

    ColorPicker.prototype.getColor = function (event) {
        return this.colorHSV;
    }
;
    ColorPicker.prototype.setColor = function (rgb) {
        this.__setColor(rgb, true);
    };

    ColorPicker.prototype.__setColor = function (rgb, updateRGBControls) {
        //--
        var hsv = utils.rgb2hsv(rgb);
        var vx = Math.round((hsv.s) / (100/200)) - 5;
        var vy = Math.round((100 - hsv.v) / (100/200)) - 5;
        var hy = 200 - 1 - Math.round(hsv.h / (360/200));

        //--
        this.colorHSV = hsv;
        this.__updateValueControls(vx, vy);
        this.__updateHueControls(hy, hsv.h);

        //--
        if (updateRGBControls) {
            this.__updateRGBControls(rgb);
        }

        //--
        var hex = utils.rgb2hex(rgb);
        this.__updateSampleControl(hex);

        //--
        app.device.setBrushColor(rgb);
    };

    ColorPicker.prototype.__updateValueControls = function (x, y) {
        //--
        this.valueKnob.style.left = x + "px";
        this.valueKnob.style.top = y + "px";
    };

    ColorPicker.prototype.__updateHueControls = function (y, h) {
        //--
        this.hueKnob.style.top = y + "px";
        //--
        var bgColor = utils.rgb2hex(utils.hsv2rgb({h:h, s:100, v:100}));
        this.valuePanel.style.backgroundColor = bgColor;
    };

    ColorPicker.prototype.__updateRGBControls = function (rgb) {
        //--
        this.colorR.value = (rgb >> 16) & 0xff;
        this.colorG.value = (rgb >> 8) & 0xff;
        this.colorB.value = rgb & 0xff;
    };

    ColorPicker.prototype.__updateSampleControl = function (hex) {
        //--
        this.startButton.style.backgroundColor = hex;
    };

    ColorPicker.prototype.__updatePanelPosition = function () {
        //--
        this.valuePanelPos = this.valuePanel.getBoundingClientRect();
        this.huePanelPos = this.huePanel.getBoundingClientRect();
        this.panelPositionChanged = false;
    };

    ColorPicker.prototype.onTouchValue = function (event) {
        //--
        if (event.etype == TouchEvent.END) {
            app.device.setBrushColor(utils.hsv2rgb(this.colorHSV));
            return;
        }

        //--
        if (this.panelPositionChanged) {
            this.__updatePanelPosition();
        }

        var x = event.touches[0].pageX - this.valuePanelPos.left - 5;
        var y = event.touches[0].pageY - this.valuePanelPos.top - 5;
        x = Math.max(-5, Math.min(x, 194));
        y = Math.max(-5, Math.min(y, 194));

        var s = Math.round((x + 5) * (100/200));
        var v = 100 - Math.round((y + 5) * (100/200));
        s = Math.max(0, Math.min(s, 100));
        v = Math.max(0, Math.min(v, 100));

        //--
        this.colorHSV.s = s;
        this.colorHSV.v = v;
        this.__updateValueControls(x, y);
        var rgb = utils.hsv2rgb(this.colorHSV);
        var hex = utils.rgb2hex(rgb);
        this.__updateRGBControls(rgb);
        this.__updateSampleControl(hex);

        //--
        event.stopPropagation();
    };

    ColorPicker.prototype.onTouchHue = function (event) {
        //--
        if (event.etype == TouchEvent.END) {
            app.device.setBrushColor(utils.hsv2rgb(this.colorHSV));
            return;
        }
        //--
        if (this.panelPositionChanged) {
            this.__updatePanelPosition();
        }

        var y = event.touches[0].pageY - this.huePanelPos.top - 1;
        y = Math.max(-1, Math.min(y, 199));

        var h = Math.round((200 - y - 1) * (360/200));
        h = Math.max(0, Math.min(h, 360));

        //--
        this.colorHSV.h = h;
        this.__updateHueControls(y, h);
        var rgb = utils.hsv2rgb(this.colorHSV);
        var hex = utils.rgb2hex(rgb);
        this.__updateRGBControls(rgb);
        this.__updateSampleControl(hex);

        //--
        event.stopPropagation();
    };

    ColorPicker.prototype.onTouchWindow = function (event) {
        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            app.moveToTopWindow(this.colorPicker);
            var rect = this.colorPicker.getBoundingClientRect();
            this.prevPos.x = rect.left - event.touches[0].pageX;
            this.prevPos.y = rect.top - event.touches[0].pageY;
            break;
        case TouchEvent.MOVE:
            //--
            var left = this.prevPos.x + event.touches[0].pageX;
            var top = this.prevPos.y + event.touches[0].pageY;
            this.colorPicker.style.left = left + 'px';
            this.colorPicker.style.top = top + 'px';
            this.panelPositionChanged = true;
            break;
        }
        //--
        event.stopPropagation();
    };

    ColorPicker.prototype.onClickSwatches = function (event) {
        //--
        var swatch = event.target;
        if (swatch.className != 'swatch') {
            return;
        }

        if (app.device.paintTool == paletta.PaintTool.EYEDROPPER) {
            //--
            var rgb = utils.hsv2rgb(this.colorHSV);
            var hex = utils.rgb2hex(rgb);
            swatch.style.backgroundColor = hex;
        } else {
            //--
            var color = swatch.style.backgroundColor;
            if (color != "") {
                var hex = utils.csscolor2hex(color);
                var rgb = utils.hex2rgb(hex);
                this.setColor(rgb);
            }
        }
    };

    paletta.ColorPicker = ColorPicker;
}());
