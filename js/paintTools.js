/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var PaintTool = {
        BRUSH:      0,
        PENCIL:     1,
        ERASER:     2,
        EYEDROPPER: 3,
        HANDTOOL:   4,
        MAXVALUE:   5,
    };

    paletta.PaintTool = PaintTool;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';
    
    var PaintToolBase = function (paintTool) {
        //--
        this.paintTool = paintTool;
    };

    PaintToolBase.prototype.onTouch = function (event) {
        //--
        app.toolbar.selectPaintTool(this.paintTool);
        this.bubbleCtrl.onTouch(event);
    };

    PaintToolBase.prototype.onClick = function (event) {
        //--
        app.toolbar.selectPaintTool(this.paintTool);
        this.bubbleCtrl.onClick(event);
    };

    paletta.PaintToolBase = PaintToolBase;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';
    
    var Globals = paletta.Globals;
    var PaintTool = paletta.PaintTool;

    var BrushTool = function () {
        //--
        paletta.PaintToolBase.call(this, PaintTool.BRUSH);
        //--
        this.bubbleCtrl = new paletta.BubbleCtrl(1/4, 1, Globals.MAX_BRUSH_SIZE);
    };

    BrushTool.prototype = new paletta.PaintToolBase();
    BrushTool.prototype.constructor = BrushTool;

    BrushTool.prototype.init = function () {
        //--
        var that = this;

        //--
        this.bubbleCtrl.init(
            function (handler) {
                that.widget.toolbar.pageSlider.setTouchHandler(handler);
            },
            function () {
                return app.device.getBrushSize(that.paintTool);
            },
            function (value) {
                app.device.setBrushSize(that.paintTool, value);
            },
            null
        );
    };

    paletta.BrushTool = BrushTool;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';

    var Globals = paletta.Globals;
    var PaintTool = paletta.PaintTool;

    var PencilTool = function () {
        //--
        paletta.PaintToolBase.call(this, PaintTool.PENCIL);
        //--
        this.bubbleCtrl = new paletta.BubbleCtrl(1/4, 1, Globals.MAX_BRUSH_SIZE);
    };

    PencilTool.prototype = new paletta.PaintToolBase();
    PencilTool.prototype.constructor = PencilTool;

    PencilTool.prototype.init = function () {
        //--
        var that = this;

        //--
        this.bubbleCtrl.init(
            function (handler) {
                that.widget.toolbar.pageSlider.setTouchHandler(handler);
            },
            function () {
                return app.device.getBrushSize(that.paintTool);
            },
            function (value) {
                app.device.setBrushSize(that.paintTool, value);
            },
            null
        );
    };

    paletta.PencilTool = PencilTool;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';

    var Globals = paletta.Globals;
    var PaintTool = paletta.PaintTool;

    var EraserTool = function () {
        //--
        paletta.PaintToolBase.call(this, PaintTool.ERASER);
        //--
        this.bubbleCtrl = new paletta.BubbleCtrl(1/4, 1, Globals.MAX_BRUSH_SIZE);
    };

    EraserTool.prototype = new paletta.PaintToolBase();
    EraserTool.prototype.constructor = EraserTool;

    EraserTool.prototype.init = function () {
        //--
        var that = this;
        //--
        this.bubbleCtrl.init(
            function (handler) {
                that.widget.toolbar.pageSlider.setTouchHandler(handler);
            },
            function () {
                return app.device.getBrushSize(that.paintTool);
            },
            function (value) {
                app.device.setBrushSize(that.paintTool, value);
            },
            null
        );
    };

    paletta.EraserTool = EraserTool;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';

    var Globals = paletta.Globals;
    var PaintTool = paletta.PaintTool;

    var EyeDropperTool = function () {
        //--
        paletta.PaintToolBase.call(this, PaintTool.EYEDROPPER);
    };

    EyeDropperTool.prototype = new paletta.PaintToolBase();
    EyeDropperTool.prototype.constructor = EyeDropperTool;

    EyeDropperTool.prototype.init = function () {
        //--
    };

    EyeDropperTool.prototype.open = function () {
        //--
        app.toolbar.selectPaintTool(this.paintTool);
        app.eyeDropper.open(false);
        return false;
    };

    EyeDropperTool.prototype.close = function () {
        //--
        app.eyeDropper.close();
    };

    paletta.EyeDropperTool = EyeDropperTool;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';

    var OpacityTool = function () {
        //--
        this.bubbleCtrl = new paletta.BubbleCtrl(1/2, 0, 100);
    };

    OpacityTool.prototype.init = function () {
        //--
        var that = this;

        //--
        this.bubbleCtrl.init(
            function (handler) {
                that.widget.toolbar.pageSlider.setTouchHandler(handler);
            },
            function () {
                return app.device.getBrushOpacity();
            },
            function (value) {
                app.device.setBrushOpacity(value);
            },
            null
        );
    };

    OpacityTool.prototype.onTouch = function (event) {
        //--
        this.bubbleCtrl.onTouch(event);
    };

    OpacityTool.prototype.onClick = function (event) {
        //--
        this.bubbleCtrl.onClick(event);
    };

    paletta.OpacityTool = OpacityTool;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';

    var CleanBrushTool = function () {
        //--
    };

    CleanBrushTool.prototype.init = function () {
        //--
        this.isDirty(false);
    };

    CleanBrushTool.prototype.open = function () {
        //--
        app.device.cleanBrush();
        this.isDirty(false);
        return false;
    };

    CleanBrushTool.prototype.isDirty = function (isDirty) {
        //--
        app.toolbar.disable(this.widget, !isDirty);
    };

    paletta.CleanBrushTool = CleanBrushTool;
}());
