/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var PaintTool = paletta.PaintTool;

    //--
    var WIDGET_SIZE = 48;

    var Toolbar = function () {
        //--
        this.widgets = [];
        this.pageSlider  = new paletta.PageSlider();
        this.toolbar     = null;
        this.paintTools  = new Array(PaintTool.MAXVALUE);
        this.opacityTool = null;
        //--
        this.selectPaintToolValue = null;
        this.selectBrushSizeValue = -1;
        this.selectBrushOpacityValue = -1;
        this.prevPos = {x:0, y:0};
        this.__visible = false;
        this.paintTool = -1;
        this.__firstUse = false;
    };

    Toolbar.prototype.init = function () {
        //--
        var that = this;

        //--
        this.addWidget('gallery', app.gallery);
        this.addWidget('colorPicker', app.colorPicker);
        this.opacityTool = this.addWidget('opacityTool', app.opacityTool);

        this.paintTools[PaintTool.BRUSH] = this.addWidget('brushTool', app.brushTool);
        this.paintTools[PaintTool.PENCIL] = this.addWidget('pencilTool', app.pencilTool);
        this.paintTools[PaintTool.ERASER] = this.addWidget('eraserTool', app.eraserTool);
        this.paintTools[PaintTool.EYEDROPPER] = this.addWidget('eyeDropperTool', app.eyeDropperTool);
        this.paintTools[PaintTool.HANDTOOL] = this.addWidget('handTool', app.handTool);

        this.addWidget('cleanBrush', app.cleanBrushTool);
        this.addWidget('layers', app.layerPanel);
        this.addWidget('reference', app.reference);
        this.addWidget('imageTool', app.imageTool);
        this.addWidget('historyPrev', app.historyPrev);
        this.addWidget('historyNext', app.historyNext);
        this.addWidget('settings', app.settings);
        this.addWidget('info', app.info);

        //--
        this.toolbar = document.getElementById('toolbar');

        //--
        var page = document.getElementById('toolbar-page');
        this.pageSlider.init(page, "widget", WIDGET_SIZE);
        this.pageSlider.onClick = function (event, index) { that.onWidgetClick(event, index); };
        this.pageSlider.onTouch = function (event, index) { return that.onWidgetTouch(event, index); };

        //--
        var widgets = this.widgets;
        for (var i = 0, n = widgets.length; i < n; ++i) {
            //--
            var widget = widgets[i];

            //--
            var div = document.createElement('div');
            div.id = 'toolbar-' + widget.buttonId;
            div.className = 'widget';
            this.pageSlider.addItem(i, div);

            //--
            widget.button = div;
            widget.toolbar = this;

            widget.object.init();
        }

        //--
        this.selectPaintTool(PaintTool.BRUSH);
    };

    Toolbar.prototype.firstUse = function () {
        //--
        if (this.__firstUse) {
            return;
        }
        this.toggle();
        this.onResize();
        this.__firstUse = true;
    };

    Toolbar.prototype.onWidgetTouch = function (event, index) {
        //--
        var that = this;

        //--
        switch (event.target.id) {
        case 'toolbar-brushTool':
            this.paintTools[PaintTool.BRUSH].object.onTouch(event);
            return true;
        case 'toolbar-pencilTool':
            this.paintTools[PaintTool.PENCIL].object.onTouch(event);
            return true;
        case 'toolbar-eraserTool':
            this.paintTools[PaintTool.ERASER].object.onTouch(event);
            return true;
        case 'toolbar-opacityTool':
            this.opacityTool.object.onTouch(event);
            return true;
        }
        //--
        return false;
    };

    Toolbar.prototype.onWidgetClick = function (event, index) {
        //--
        var that = this;

        //--
        var widget = this.widgets[index];
        if (widget.disabled) {
            return;
        }

        //--
        switch (event.target.id) {
        case 'toolbar-brushTool':
            this.paintTools[PaintTool.BRUSH].object.onClick(event);
            break;
        case 'toolbar-pencilTool':
            this.paintTools[PaintTool.PENCIL].object.onClick(event);
            break;
        case 'toolbar-eraserTool':
            this.paintTools[PaintTool.ERASER].object.onClick(event);
            break;
        case 'toolbar-opacityTool':
            this.opacityTool.object.onClick(event);
            break;
        default:
            if (widget.opened) {
                this.__close(widget);
            } else {
                widget.opened = widget.object.open();
                if (widget.opened) {
                    widget.button.style.backgroundColor = '#83994c';
                }
            }
            break;
        }
    };

    Toolbar.prototype.onResize = function () {
        //--
        var toolbar = this.toolbar;
        var bottom  = toolbar.parentNode.getBoundingClientRect().bottom;
        var top     = toolbar.getBoundingClientRect().top;
        var viewportSize = Math.floor((bottom - top) / WIDGET_SIZE) * WIDGET_SIZE;
        toolbar.style.height = Math.min(viewportSize, this.pageSlider.pageSize) + 'px';

        //--
        this.pageSlider.positionChanged();
    };

    Toolbar.prototype.toggle = function () {
        //--
        if (this.__visible) {
            this.toolbar.style.display = 'none';
            this.__visible = false;
        } else {
            this.toolbar.style.display = 'block';
            this.__visible = true;
        }
    };

    Toolbar.prototype.addWidget = function (buttonId, object) {
        var index = this.widgets.length;
        var widget = {
            index: index,
            buttonId: buttonId,
            object: object,
            opened: false,
            button: null,
            toolbar: null,
            disabled: false,
        };
        this.widgets.push(widget);
        object.widget = widget;
        return widget;
    };

    Toolbar.prototype.close = function (object) {
        //--
        this.__close(object.widget);
    };

    Toolbar.prototype.__close = function (widget) {
        //--
        widget.object.close();
        widget.opened = false;
        widget.button.style.backgroundColor = '#daff7f';
    };

    Toolbar.prototype.disable = function (widget, disable) {
        //--
        if (widget.disabled != disable) {
            widget.button.style.opacity = disable ? 0.5 : 1.0;
            widget.disabled = disable;
        }
    };

    Toolbar.prototype.selectPaintTool = function (paintTool) {
        //--
        if (this.paintTool == paintTool) {
            return;
        }

        //--
        if (this.paintTool != -1) {
            //--
            this.paintTools[this.paintTool].button.style.backgroundColor = '#daff7f';

            //--
            switch (this.paintTool) {
            case PaintTool.EYEDROPPER:
            case PaintTool.HANDTOOL:
                this.paintTools[this.paintTool].object.close();
                break;
            }
        }

        if (paintTool == PaintTool.HANDTOOL) {
            app.eyeDropper.close(); // need to this to handle auto-closing for the reference panel
        }

        this.paintTools[paintTool].button.style.backgroundColor = '#83994c';

        //--
        app.device.setPaintTool(paintTool);

        //--
        this.paintTool = paintTool;
    };

    paletta.Toolbar = Toolbar;
}());
