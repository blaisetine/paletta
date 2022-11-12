/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals = paletta.Globals;
    var TouchEvent = utils.TouchEvent;

    var Reference = function () {
        //--
        this.reference = null;
        this.image = null;
        this.canvas = null;
        this.context = null;
        this.resize = null;
        this.prevPos = {x:0, y:0};
        this.width = 0;
        this.height = 0;
        this.minWidth = 0;
        this.minHeight = 0;
        this.file = null;
        this.imageWidth  = 0;
        this.imageHeight = 0;
        this.onSizeChanged = true;
        this.__onTouch =  null;
        this.positionChanged = true;
        this.screenToCanvas = null;
        this.cvTransform = null;
    };

    Reference.prototype.init = function () {
        //--
        var that = this;

        //--
        this.reference = document.getElementById('reference');
        this.image     = document.getElementById('reference-image');
        this.canvas    = document.getElementById('reference-canvas');
        this.context   = this.canvas.getContext('2d');

        //--
        var rect = this.reference.getBoundingClientRect();
        this.minWidth  = rect.width;
        this.minHeight = rect.height;

        //--
        var file = document.getElementById('reference-file');
        file.addEventListener('change', function (e) { that.__onLoadFromLocalDrive(e.target.files[0]); }, false);

        //--
        var closeButton = document.getElementById('reference-close');
        closeButton.addEventListener('click', function (event) { app.toolbar.close(that); }, false);

        //--
        var resizeButton = document.getElementById('reference-resize');
        app.touch.attach(resizeButton, TouchEvent.START | TouchEvent.MOVE | TouchEvent.END, function (event) {that.__onResize(event);});

        //--
        app.touch.attach(this.reference, TouchEvent.ALL, function (event) {that.__onWindowTouch(event);});

        //--
        app.touch.attach(this.canvas, TouchEvent.ALL, function (event) {that.__onTouch(event);});

        //--
        this.setInputCallback(null);
    };

    Reference.prototype.open = function () {
        //--
        app.moveToTopWindow(this.reference);
        this.reference.style.display = 'block';
        //--
        if (this.onSizeChanged) {
            this.__onSizeChanged();
        }
        return true;
    };

    Reference.prototype.close = function () {
        //--
        this.reference.style.display = 'none';
        app.moveToBottomWindow(this.reference);
    };

    Reference.prototype.setInputCallback = function (callback) {
        //--
        var that = this;

        //--
        if  (callback) {
            this.__onTouch = callback;
        } else {
            this.__onTouch = function (event) { that.__onCanvasTouch(event); };
        }
    };

    Reference.prototype.getPixelColor = function (x, y) {
        //--
        var imageData = this.context.getImageData(x, y, 1, 1);
        var pixels = imageData.data;
        return (pixels[0] << 16) | (pixels[1] << 8) | pixels[2]; // BRGA format
    };

    Reference.prototype.toCanvasCoords = function (pageX, pageY) {
        //--
        if (this.positionChanged) {
            this.screenToCanvas = utils.matrix.fromElement(this.canvas).inverse();
            this.positionChanged = false;
        }
        return this.screenToCanvas.transformPoint(pageX, pageY);
    };

    Reference.prototype.__onSizeChanged = function () {
        //--
        var rect = this.image.getBoundingClientRect();
        this.imageWidth  = rect.width;
        this.imageHeight = rect.height;

        if (this.file != null) {
            this.__onLoadFromLocalDrive(this.file);
        } else {
            this.canvas.width  = 0;
            this.canvas.height = 0;
        }

        //--
        this.onSizeChanged = false;
    };

    Reference.prototype.__onLoadFromLocalDrive = function (file) {
        //--
        var that = this;

        if (file == null) {
            return;
        }

        //--
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
            //--
            var scaleX = that.imageWidth / img.width;
            var scaleY = that.imageHeight / img.height;
            var scale  = Math.min(scaleX, scaleY);
            var width  = Math.round(img.width * scale);
            var height = Math.round(img.height * scale);
            that.canvas.width  = width;
            that.canvas.height = height;
            that.context.drawImage(img, 0, 0, width, height);

            //--
            var x0 = (that.imageWidth - width) >> 1;
            var y0 = (that.imageHeight - height) >> 1;
            var cvTransform = {tx: x0, ty: y0, s: 1, r: 0};
            that.updateTransform(cvTransform);

            // rebind the eyeDropper
            app.eyeDropper.bind(that, null);

            //--
            that.file = file;
        };
        img.src = url;
    };

    Reference.prototype.__onResize = function (event) {
        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            var rect = this.reference.getBoundingClientRect();
            this.width  = rect.width;
            this.height = rect.height;
            //--
            this.prevPos.x = event.touches[0].pageX;
            this.prevPos.y = event.touches[0].pageY;
            break;
        case TouchEvent.MOVE:
            //--
            var width  = Math.max(this.minWidth, this.width + (event.touches[0].pageX - this.prevPos.x));
            var height = Math.max(this.minHeight, this.height + (event.touches[0].pageY - this.prevPos.y));
            this.reference.style.width  = width + 'px';
            this.reference.style.height = height + 'px';
            break;
        case TouchEvent.END:
        case TouchEvent.CANCEL:
            //--
            var rect = this.reference.getBoundingClientRect();
            if (this.width != rect.width
             || this.height != rect.height)
            {
                this.__onSizeChanged();
            }
            break;
        }
        event.stopPropagation();
    };

    Reference.prototype.__onCanvasTouch = function (event) {
        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            if (this.file) {
                //--
                if (app.handTool.enabled) {
                    app.handTool.bind(this);
                    event.stopPropagation();
                    return;
                } else {
                    app.eyeDropper.bind(this, event.touches[0]);
                    event.stopPropagation();
                    return;
                }
            }
            //--
            break;
        case TouchEvent.MOVE:
        case TouchEvent.END:
        case TouchEvent.CANCEL:
            //--
            break;
        }
        event.stopPropagation();
    };

    Reference.prototype.__onWindowTouch = function (event) {
        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            app.moveToTopWindow(this.reference);
            var rect = this.reference.getBoundingClientRect();
            this.prevPos.x = rect.left - event.touches[0].pageX;
            this.prevPos.y = rect.top - event.touches[0].pageY;
            break;
        case TouchEvent.MOVE:
            //--
            var left = this.prevPos.x + event.touches[0].pageX;
            var top = this.prevPos.y + event.touches[0].pageY;
            this.reference.style.left = left + 'px';
            this.reference.style.top = top + 'px';
            break;
        case TouchEvent.END:
        case TouchEvent.CANCEL:
            //--
            this.positionChanged = true;
            break;
        }
        event.stopPropagation();
    };

    Reference.prototype.updateTransform = function (cvTransform) {
        //--
        var transform = "translate(" + cvTransform.tx + "px," + cvTransform.ty + "px) " +
                        "scale(" + cvTransform.s + "," + cvTransform.s + ") " +
                        "rotate(" + cvTransform.r + "rad)";
        this.canvas.style.webkitTransform = transform;
        //console.log(transform);

        //--
        this.cvTransform = cvTransform;
        this.positionChanged = true;
    };

    paletta.Reference = Reference;
}());
