/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals = paletta.Globals;
    var TouchEvent = utils.TouchEvent;
    var PaintTool = paletta.PaintTool;
    
    function coverageMask(pixels, x, y, width) {
        //--
        var width1 = width + 1;
        var index = x + y * width1;
        return (pixels[index+1+width1] << 24) | (pixels[index+width1] << 16) | (pixels[index+1] << 8) | pixels[index];
    }

    function coverageBlend(mask, xfrac, yfrac) {
        //--
        var r0 = ((mask & 0xff) * xfrac + ((mask >>> 8) & 0xff) * (0x10000 - xfrac) + 0x8000) >> 16;
        var r1 = (((mask >>> 16) & 0xff) * xfrac + ((mask >>> 24) & 0xff) * (0x10000 - xfrac) + 0x8000) >> 16;
        return (r0 * yfrac + r1 * (0x10000 - yfrac) + 0x8000) >> 16;
    }

    var Device = function () {
        //--
        this.colorPicker = null;
        this.handTool = null;
        this.eyeDropper = null;
        this.history = null;
        this.dirtyRects = null;
        this.layerPanel = null;

        //--
        this.context = null;
        this.canvas = null;
        this.displayBuffer = null;
        this.displayImage = null;
        this.colorBuffer = null;
        this.backBuffer = null;
        this.stencilBuffer = null;
        this.stagingBuffer = null;
        this.aaBuffer = null;
        this.brushBuffers = null;
        this.cbrushBuffer = null;
        this.cbrushBufferP = null;

        //--
        this.paintTool = 0;
        this.brushWidth = 0;
        this.pencilWidth = 0;
        this.eraserWidth = 0;
        this.opacity = 0;
        this.brushColor = 0x0;
        this.bgColor = 0x0;
        this.loading = Globals.DEFAULT_BRUSH_LOAD;
        this.maxBrushSize = utils.ceilE(Globals.MAX_BRUSH_SIZE * window.devicePixelRatio);
        //--
        this.canvasWidth = null;
        this.canvasHeight = null;
        this.isStrokeStart = false;
        this.eyeDropperTimeoutID = null;
        this.prevCoords = {x:0, y:0};
        this.prevOpacity = 0;
        this.prevBrushSize = 0;
        this.last_pos = 0;
        this.last_frac = 0;
        this.last_brushSize = 0;
        this.isCanvasDirty = false;
        this.isCanvasRotated = false;
        this.resetBrushColor = false;
        this.dirtyRectsPos = {x:-1, y:-1};

        //--
        this.__draw = null;
        this.__onTouch = null;

        //--
        this.layers = null;
        this.activeLayerIndex = 0;
        this.isLayerWriteEnabled = true;

        //--
        this.screenToCanvas = null;
        this.cvTransform = null;
        this.positionChanged = true;

        //--
        this.pressureOpacity = true;
        this.pressureSize = true;

        //--
        this.autoColorPicker = null;
    };

    Device.prototype.init = function () {
        //--
        var that = this;

        //--
        this.colorPicker = app.colorPicker;
        this.handTool    = app.handTool;
        this.eyeDropper  = app.eyeDropper;
        this.history     = app.history;
        this.dirtyRects  = app.dirtyRects;
        this.layerPanel  = app.layerPanel;

        //--
        this.canvas  = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');
        this.context.globalCompositeOperation = 'copy';

        //--
        app.touch.attach(this.canvas, TouchEvent.ALL, function (event) {that.__onTouch(event);});

        //--
        this.setInputCallback(null);

        //--
        this.initPaintTools();
    };

    Device.prototype.initPaintTools = function () {         
        //--
        this.brushBuffers = new Array(this.maxBrushSize);
        for (var i = 0, n = this.maxBrushSize; i < n; ++i) {
            this.brushBuffers[i] = this.createBrushBuffer(i+1);
        }

        //--
        var brushSize = this.maxBrushSize+1;
        this.cbrushBuffer = new Uint32Array(brushSize * brushSize);
        this.cbrushBufferP= new Uint32Array(brushSize * brushSize);

        //--
        this.setBrushColor(Globals.DEFAULT_BRUSH_COLOR);
        this.setBrushSize(PaintTool.BRUSH, Globals.DEFAULT_BRUSH_SIZE);
        this.setBrushSize(PaintTool.PENCIL, Globals.DEFAULT_PENCIL_SIZE);
        this.setBrushSize(PaintTool.ERASER, Globals.DEFAULT_ERASER_SIZE);
        this.setBrushOpacity(100);
    };

    Device.prototype.createBrushBuffer = function (paintSize) {
        //--
        var width  = paintSize + 2;
        var height = paintSize + 2;

        //--
        var canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');

        //--
        ctx.beginPath();
        var radius = paintSize / 2;
        ctx.arc(radius + 1, radius + 1, radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();

        //--
        var imgData = ctx.getImageData(0, 0, width, height);
        var pixels  = imgData.data;
        var paintBuffer = new Uint8Array(width * height);
        for (var i = 0, n = paintBuffer.length; i < n; ++i) {
            paintBuffer[i] = pixels[i*4+3];
        }

        return paintBuffer;
    };

    Device.prototype.newProject = function (canvasWidth, canvasHeight, bgColor) {
        //--
        app.trace('{"id":"newProject","canvasWidth":' + canvasWidth + ',"canvasHeight":' + canvasHeight + ',"bgColor":'+ bgColor + '}');

        //--
        this.reset(canvasWidth, canvasHeight, bgColor);
        this.layerPanel.addLayer(false);
        this.present(0, 0, canvasWidth, canvasHeight);
    };

    Device.prototype.openProject = function (projectID, callback) {
        //--
        app.trace('{"id":"openProject","projectID":' + projectID + '}');
        //--
        var that = this;

        //--
        function __callback(data) {
            //--
            if (data == null) {
                callback(false);
                return;
            }
            //--
            that.loadStorageData(data, callback);
        }

        //--
        app.fileData.load(projectID, __callback);
    };

    Device.prototype.reset = function (canvasWidth, canvasHeight, bgColor) {
        //--
        this.bgColor      = bgColor;
        this.canvasWidth  = canvasWidth;
        this.canvasHeight = canvasHeight;

        //--
        this.canvas.width  = canvasWidth;
        this.canvas.height = canvasHeight;

        //--
        var bufferSize     = canvasWidth * canvasHeight;
        this.backBuffer    = new Uint32Array(bufferSize);
        this.stencilBuffer = new Uint32Array(((canvasWidth + 31) >> 5) * canvasHeight);
        this.stagingBuffer = new Uint32Array(bufferSize);
        this.aaBuffer      = new Uint16Array(bufferSize);
        this.displayImage  = this.context.createImageData(canvasWidth, canvasHeight);
        this.displayBuffer = new Uint32Array(this.displayImage.data.buffer);

        //--
        this.history.reset(canvasWidth, canvasHeight);

        //--
        this.layerPanel.reset(canvasWidth, canvasHeight);
        this.layers = this.layerPanel.getLayers();

        //--
        var cvTransform = {
            tx: (window.innerWidth - canvasWidth) >> 1,
            ty: (window.innerHeight - canvasHeight) >> 1,
            s:  Math.min(window.innerWidth / canvasWidth, window.innerHeight / canvasHeight),
            r:  0
        };
        this.updateTransform(cvTransform);
    };

    Device.prototype.readStorageInfo = function (data, callback) {
        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(null);
        }

        //--
        var reader = new FileReader();
        reader.onerror = errorHandler;
        data.chunk = data.slice || data.webkitSlice || data.mozSlice || data.mzSlice;
        var headerBlob = data.chunk(0, 10 * 4, 'application/octet-stream');
        reader.onload = function (event) {
            //--
            var header = new Uint32Array(event.target.result);
            var nameBlob = data.chunk(10 * 4, header[6], 'text/plain');
            reader.onload = function (event) {
                //--
                var name = event.target.result;
                var thumbBlob = data.chunk(header[6], header[7], 'image/png');
                reader.onload = function (event) {
                    //--
                    var dateNum = header[5];
                    var info = {
                        name:   name,
                        date:   new Date((dateNum >>> 16) & 0xffff, (dateNum >>> 8) & 0xff, dateNum & 0xff),
                        width:  header[1],
                        height: header[2],
                        url:    event.target.result
                    };
                    //--
                    callback(info);
                };
                reader.readAsDataURL(thumbBlob);
            };
            reader.readAsText(nameBlob);
        };
        reader.readAsArrayBuffer(headerBlob);
    };

    Device.prototype.loadStorageData = function (data, callback) {
        //--
        var that = this;

        //--
        function errorHandler(e) {
            console.log('Error', e);
            callback(false);
        }

        //--
        var reader = new FileReader();
        reader.onerror = errorHandler;
        data.chunk = data.slice || data.webkitSlice || data.mozSlice || data.mzSlice;
        var headerBlob = data.chunk(0, 10 * 4, 'application/octet-stream');
        reader.onload = function (event) {
            //--
            var header = new Uint32Array(event.target.result);
            var layersBlob = data.chunk(header[7], header[8], 'application/octet-stream');
            reader.onload = function (event) {
                //--
                var layersView = new DataView(event.target.result);
                var canvasWidth  = header[1];
                var canvasHeight = header[2];
                var bgColor      = header[3];
                var numLayers    = header[4];

                //--
                that.reset(canvasWidth, canvasHeight, bgColor);

                //--
                var canvasSize = canvasWidth * canvasHeight;
                for (var i = 0, l = 0; l < numLayers; ++l) {
                    //--
                    var visible = layersView.getUint32(i);
                    i += 4;
                    var locked = layersView.getUint32(i);
                    i += 4;
                    var opacity = layersView.getUint32(i);
                    i += 4;
                    var blendMode = layersView.getUint32(i);
                    i += 4;
                    //--
                    var colorBuffer = new Uint32Array(canvasSize);
                    for (var j = 0; j < canvasSize; ++j, i += 4) {
                        colorBuffer[j] = layersView.getUint32(i);
                    }
                    //--
                    that.layerPanel.newLayer(opacity, blendMode, visible ? true : false, locked ? true : false, colorBuffer, false);
                }

                //--
                that.present(0, 0, canvasWidth, canvasHeight);

                //--
                callback(true);
            };
            reader.readAsArrayBuffer(layersBlob);
        };
        reader.readAsArrayBuffer(headerBlob);
    };

    Device.prototype.createStorageData = function (name) {
        //--
        var layer_header_size = 4 * 4;
        var canvasSize = this.canvasWidth * this.canvasHeight;
        var layerSize  = layer_header_size + canvasSize * 4;
        var layersData = new ArrayBuffer(this.layers.length * layerSize);

        //--
        var layers = this.layers;
        var layersView = new DataView(layersData);
        for (var i = 0, l = 0, n = layers.length; l < n; ++l) {
            //--
            var layer = layers[l];

            //--
            layersView.setUint32(i, layer.visible ? 1 : 0);
            i += 4;
            layersView.setUint32(i, layer.locked ? 1 : 0);
            i += 4;
            layersView.setUint32(i, layer.opacity);
            i += 4;
            layersView.setUint32(i, layer.blendMode);
            i += 4;

            //--
            var colorBuffer = layer.colorBuffer;
            for (var j = 0; j < canvasSize; ++j, i += 4) {
                layersView.setUint32(i, colorBuffer[j]);
            }
        }

        //--
        var url = utils.generateThumbNail(this.canvas, Globals.GALLERY_THUMBNAIL_SIZE, 'image/png');

        //--
        var nameBlob   = new Blob([name], {type: 'text/plain'});
        var thumbBlob  = utils.dataURItoBlob(url);
        var layersBlob = new Blob([layersData], {type: 'application/octet-stream'});

        //--
        var date  = new Date();
        var dateNum = date.getDate() | (date.getMonth() << 8) | (date.getFullYear() << 16);

        //--
        var header = new Uint32Array(10);
        header[0] = 0;                  // version
        header[1] = this.canvasWidth;   // width
        header[2] = this.canvasHeight;  // height
        header[3] = this.bgColor;       // bgColor
        header[4] = this.layers.length; // num Layers
        header[5] = dateNum;            // date
        header[6] = 10 * 4 + nameBlob.size;      // name end
        header[7] = header[6] + thumbBlob.size;  // thumbNail end
        header[8] = header[7] + layersBlob.size; // layers end
        header[9] = header[8] + 10 * 4;          // object end

        //--
        var headerBlob = new Blob([header], {type: 'application/octet-stream'});
        var data = new Blob([headerBlob, nameBlob, thumbBlob, layersBlob]);

        //--
        return data;
    };

    Device.prototype.setInputCallback = function (callback) {
        //--
        var that = this;
        //--
        if  (callback) {
            this.__onTouch = callback;
        } else {
            this.__onTouch = function (event) { that.onTouch(event); }
        }
    };

    Device.prototype.toggleSaved = function () {
        var isCanvasDirty = this.isCanvasDirty;
        this.isCanvasDirty = false;
        return !isCanvasDirty;
    };

    Device.prototype.getCanvas = function () {
        return this.canvas;
    };

    Device.prototype.getContext = function () {
        return this.context;
    };

    Device.prototype.getImageColor = function (x, y) {
        //--
        var index = x + y * this.canvasWidth;
        var color = utils.rgba2bgra(this.autoColorPicker[index]);
        return color;
    };

    Device.prototype.getPixelColor = function (x, y) {
        //--
        var imageData = this.context.getImageData(x, y, 1, 1);
        var pixels = imageData.data;
        return (pixels[0] << 16) | (pixels[1] << 8) | pixels[2]; // BRGA format
    };

    Device.prototype.setActiveLayer = function (index) {
        //--
        var layer = this.layers[index];
        this.colorBuffer = layer.colorBuffer;
        this.activeLayerIndex = index;
        //--
        this.updateBackBuffer();
    };

    Device.prototype.setLayerWriteEnabled = function (enabled) {
        //--
        this.isLayerWriteEnabled = enabled;
    };

    Device.prototype.getPaintTool = function () {
        return this.paintTool;
    };

    Device.prototype.setPaintTool = function (paintTool) {
        //--
        app.trace('{"id":"setPaintTool","paintTool":' + paintTool + '}');

        //--
        switch (paintTool) {
        case PaintTool.BRUSH:
            this.__draw = this.__drawBrush;
            break;
        case PaintTool.PENCIL:
            this.__draw = this.__drawPencil;
            break;
        case PaintTool.ERASER:
            this.__draw = this.__erase;
            break;
        }
        this.paintTool = paintTool;
    };

    Device.prototype.getBrushColor = function (color) {
        // convert from RGBA to BGRA
        return utils.rgba2bgra(this.brushColor);
    };

    Device.prototype.setBrushColor = function (color) {
        //--
        app.trace('{"id":"setBrushColor","color":' + color + '}');

        // Convert from BRGA to RGBA
        this.brushColor = utils.rgba2bgra(color);
        this.resetBrushColor = true;
    };

    Device.prototype.getBrushOpacity = function () {
        //--
        return this.opacity;
    };

    Device.prototype.setBrushOpacity = function (opacity) {
        //--
        app.trace('{"id":"setBrushOpacity","opacity":' + opacity + '}');
        //--
        this.opacity = opacity;
    };

    Device.prototype.getBrushSize = function (paintTool) {
        //--
        switch (paintTool) {
        default:
        case PaintTool.BRUSH:
            return this.brushWidth;
        case PaintTool.PENCIL:
            return this.pencilWidth;
        case PaintTool.ERASER:
            return this.eraserWidth;
        }
    };

    Device.prototype.setBrushSize = function (paintTool, size) {
        //--
        app.trace('{"id":"setBrushSize","paintTool":' + paintTool + ',"size":' + size + '}');
        
        //--
        var scaled_size = Math.ceil(size * window.devicePixelRatio);
        switch (paintTool) {
        case PaintTool.BRUSH:
            this.brushWidth = scaled_size;
            break;
        case PaintTool.PENCIL:
            this.pencilWidth = scaled_size;
            break;
        case PaintTool.ERASER:
            this.eraserWidth = scaled_size;
            break;
        }
    };

    Device.prototype.drawLine = function (cx, cy, brushSize, opacity) {
        //--
        var px = this.prevCoords.x;
        var py = this.prevCoords.y;
        this.prevCoords.x = cx;
        this.prevCoords.y = cy;

        //--
        var pBrushSize = this.prevBrushSize;
        var pOpacity   = this.prevOpacity;
        this.prevBrushSize = brushSize;
        this.prevOpacity   = opacity;

        //--
        var deltaX = cx - px;
        var deltaY = cy - py;
        var __deltaX = Math.abs(deltaX);
        var __deltaY = Math.abs(deltaY);

        //--
        var __deltaXY = __deltaX | __deltaY;
        if (__deltaXY == 0x10000 || __deltaXY == 0) {
            this.__draw(px, py, pBrushSize, pOpacity);
        } else {
            if (__deltaX > __deltaY) {
                //--
                var s  = pBrushSize << 24;
                var o  = pOpacity << 15;
                var G  = 0x10000 / __deltaX;
                var dS = Math.round(((brushSize - pBrushSize) << 24) * G);
                var dO = Math.round(((opacity - pOpacity) << 15) * G);
                var dy = Math.round((deltaY * 0x10000) / deltaX);
                //--
                if (deltaX > 0) {
                    for (var x = px, y = py; x < cx; x += 0x10000, y += dy, s += dS, o += dO) {
                        this.__draw(x, y, (s + 0x800000) >> 24, (o + 0x4000) >> 15);
                    }
                } else {
                    for (var x = px, y = py; x > cx; x -= 0x10000, y -= dy, s += dS, o += dO) {
                        this.__draw(x, y, (s + 0x800000) >> 24, (o + 0x4000) >> 15);
                    }
                }
            } else {
                //--
                var s  = pBrushSize << 24;
                var o  = pOpacity << 15;
                var G  = 0x10000 / __deltaY;
                var dS = Math.round(((brushSize - pBrushSize) << 24) * G);
                var dO = Math.round(((opacity - pOpacity) << 15) * G);
                var dx = Math.round((deltaX * 0x10000) / deltaY);
                //--
                if (deltaY > 0) {
                    for (var y = py, x = px; y < cy; y += 0x10000, x += dx, s += dS, o += dO) {
                        this.__draw(x, y, (s + 0x800000) >> 24, (o + 0x4000) >> 15);
                    }
                } else {
                    for (var y = py, x = px; y > cy; y -= 0x10000, x -= dx, s += dS, o += dO) {
                        this.__draw(x, y, (s + 0x800000) >> 24, (o + 0x4000) >> 15);
                    }
                }
            }
        }

        //--
        if (px > cx) {
            var t = px; px = cx; cx = t;
        }
        if (py > cy) {
            var t = py; py = cy; cy = t;
        }

        //--
        var brushWidth  = Math.max(brushSize, pBrushSize)+1;
        var brushWidthH = brushWidth >> 1;
        var x0 = Math.max((px >> 16) - brushWidthH, 0);
        var y0 = Math.max((py >> 16) - brushWidthH, 0);
        var x1 = Math.min((cx >> 16) - brushWidthH + brushWidth, this.canvasWidth);
        var y1 = Math.min((cy >> 16) - brushWidthH + brushWidth, this.canvasHeight);
        this.present(x0, y0, x1, y1);

        //--
        var _x0 = x0 >> 5;
        var _y0 = y0 >> 5;
        if (_x0 != this.dirtyRectsPos.x || _y0 != this.dirtyRectsPos.y) {
            this.dirtyRectsPos.x = _x0;
            this.dirtyRectsPos.y = _y0;
            this.dirtyRects.add(_x0, _y0, (x1 + 31) >> 5, (y1 + 31) >> 5);
        }
   };

   Device.prototype.drawPoint = function (x, y, brushSize, opacity) {
        //--
        this.__draw(x, y, brushSize, opacity);

        //--
        var brushWidth  = brushSize+1;
        var brushWidthH = brushWidth >> 1;
        var x0 = (x >> 16) - brushWidthH;
        var y0 = (y >> 16) - brushWidthH;
        var x1 = Math.min(x0 + brushWidth, this.canvasWidth);
        var y1 = Math.min(y0 + brushWidth, this.canvasHeight);
        x0 = Math.max(x0, 0);
        y0 = Math.max(y0, 0);
        this.present(x0, y0, x1, y1);

        //--
        this.dirtyRects.add(x0 >> 5, y0 >> 5, (x1 + 31) >> 5, (y1 + 31) >> 5);
    };

    Device.prototype.calcOpacity = function (pressure) {
        //--
        var opacity = Math.round((this.opacity << 15) / 100);
        if (this.pressureOpacity) {
            opacity = Math.min((opacity * pressure) >>> (16-1), 0x8000);
        }
        //console.log("opacity="+opacity);
        return opacity;
    };

    Device.prototype.calcBrushSize = function (pressure) {
        //--
        var brushSize;
        switch (this.paintTool) {
        case PaintTool.BRUSH:
            brushSize = this.brushWidth;
            break;
        case PaintTool.PENCIL:
            brushSize = this.pencilWidth;
            break;
        case PaintTool.ERASER:
            brushSize = this.eraserWidth;
            break;
        }
        if (this.pressureSize) {
            brushSize = Math.max(1, Math.min((brushSize * pressure) >>> 15, this.maxBrushSize));
        }
        if (this.paintTool == PaintTool.BRUSH && this.resetBrushColor) {
            this.__cleanBrush(brushSize);
        }
        //console.log("brushSize="+brushSize);
        return brushSize;
    };

    Device.prototype.cleanBrush = function () {
        //--
        app.trace('{"id":"cleanBrush"}');
        //--
        this.resetBrushColor = true;
    };

    Device.prototype.__cleanBrush = function (brushSize) {
        //--
        var brushColor   = 0xff000000 | this.brushColor;
        var cbrushBuffer = this.cbrushBufferP;
        for (var i = 0, n = cbrushBuffer.length; i < n; ++i) {
            cbrushBuffer[i] = brushColor;
        }
        this.last_brushSize = brushSize;
        app.cleanBrushTool.isDirty(false);
        this.resetBrushColor = false;
    };

    Device.prototype.__onBrushStrokeStart = function (cbrushBuffer) {
        //--
        var brushColor  = this.brushColor;
        var brushColorB = (brushColor >> 16) & 0xff;
        var brushColorG = (brushColor >> 8) & 0xff;
        var brushColorR = brushColor & 0xff;
        //--
        for (var i = 0, n = cbrushBuffer.length; i < n; ++i) {
            //--
            var color  = cbrushBuffer[i];
            var colorB = (color >> 16) & 0xff;
            var colorG = (color >> 8) & 0xff;
            var colorR = color & 0xff;
            //--
            colorB = (brushColorB + colorB + 1) >> 1;
            colorG = (brushColorG + colorG + 1) >> 1;
            colorR = (brushColorR + colorR + 1) >> 1;
            var color = 0xff000000 | (colorB << 16) | (colorG << 8) | colorR;
            //--
            cbrushBuffer[i] = color;
        }
        //--
        this.isStrokeStart = false;
    };

    Device.prototype.__drawBrush = function (cx, cy, brushSize, opacity) {
        //--
        //console.log('cx='+cx.toString(16)+',cy='+cy.toString(16));
        var colorBuffer   = this.colorBuffer;
        var stencilBuffer = this.stencilBuffer;
        var stagingBuffer = this.stagingBuffer;
        var brushBuffer   = this.brushBuffers[brushSize-1];
        var aaBuffer      = this.aaBuffer;
        var loading       = this.loading;

        //--
        var cbrushBuffer  = this.cbrushBuffer;
        var cbrushBufferP = this.cbrushBufferP;
        this.cbrushBufferP= cbrushBuffer;
        this.cbrushBuffer = cbrushBufferP;

        //--
        var canvasWidth = this.canvasWidth;
        var canvasHeight= this.canvasHeight;
        var brushWidth  = brushSize+1;
        var maxBrushSize= this.maxBrushSize+1;
        var srcWidth    = brushWidth;
        var srcHeight   = brushWidth;

        //--
        var brushWidthH = brushWidth << (16-1);
        var dstX  = cx - brushWidthH;
        var dstY  = cy - brushWidthH;
        var xfrac = dstX & 0xffff;
        var yfrac = dstY & 0xffff;
        dstX >>= 16;
        dstY >>= 16;

        //--
        var deltaX = dstX - (this.last_pos & 0xffff);
        var deltaY = dstY - (this.last_pos >>> 16);
        this.last_pos = (dstY << 16) | dstX;
        var last_frac = this.last_frac;
        this.last_frac = (yfrac << 16) | xfrac;
        var pbrushWidth = this.last_brushSize+1;
        this.last_brushSize = brushSize;
        var pbrushBuffer = this.brushBuffers[pbrushWidth-2];

        //--
        if (brushWidth != pbrushWidth) {
            if (brushWidth > pbrushWidth) {
                utils.bitBlt32_nearest(
                    cbrushBuffer, maxBrushSize, maxBrushSize, 0, 0, brushWidth, brushWidth,
                    cbrushBufferP, maxBrushSize, maxBrushSize, 0, 0, pbrushWidth, pbrushWidth
                );
            } else {
                utils.resize32_abuffer(
                    cbrushBuffer, maxBrushSize, maxBrushSize, 0, 0, brushWidth, brushWidth,
                    cbrushBufferP, maxBrushSize, maxBrushSize, 0, 0, pbrushWidth, pbrushWidth,
                    brushBuffer, brushWidth+1
                );
            }
        } else {
            cbrushBuffer.set(cbrushBufferP);
        }

        //--
        if (this.isStrokeStart) {
            this.__onBrushStrokeStart(cbrushBuffer);
            deltaX = -2147483647;  //-MAX_INT32
            loading = 0x8000;
        }

        // clamp x coordinate
        var srcX = 0;
        if (dstX < 0) {
            srcX = -dstX;
            srcWidth += dstX;
            dstX = 0;
        }
        var overflowX = (dstX + srcWidth) - canvasWidth;
        if (overflowX > 0) {
            srcWidth -= overflowX;
        }

        // clamp y coordinate
        var srcY = 0;
        if (dstY < 0) {
            srcY = -dstY;
            srcHeight += dstY;
            dstY = 0;
        }
        var overflowY = (dstY + srcHeight) - canvasHeight;
        if (overflowY > 0) {
            srcHeight -= overflowY;
        }

        //--
        var offsetX = dstX - srcX;
        var offsetY = dstY - srcY;

        //--
        var xmax = srcX + srcWidth;
        var ymax = srcY + srcHeight;

        //--
        for (var y = srcY; y < ymax; ++y) {
            //--
            var srcRow = y * maxBrushSize;
            var dstRow = offsetX + (y + offsetY) * canvasWidth;
            var stcRow = offsetX + (y + offsetY) * ((canvasWidth + 31) & ~31);
            //--
            for (var x = srcX; x < xmax; ++x) {
                // Brush shape test
                var aa = coverageMask(brushBuffer, x, y, brushWidth);
                if (aa == 0) {
                    continue;
                }
                aa = coverageBlend(aa, xfrac, yfrac);

                //--
                var srcIndex = x + srcRow;
                var dstIndex = x + dstRow;
                var stcIndex = x + stcRow;

                //--
                var bb = 0;
                var oo = aaBuffer[dstIndex];

                // Brush overdraw test
                var px = (x + deltaX) >>> 0; // Unsigned conversion!
                var py = (y + deltaY) >>> 0; // Unsigned conversion!
                if ((px < pbrushWidth) && (py < pbrushWidth)) {
                    bb = coverageMask(pbrushBuffer, px, py, pbrushWidth);
                    if (bb != 0) {
                        var pIndex = px + py * maxBrushSize;
                        cbrushBuffer[srcIndex] = cbrushBufferP[pIndex];
                        bb = coverageBlend(bb, (last_frac & 0xffff), (last_frac >>> 16));
                        if (aa <= bb) {
                            if (aa == 0 || opacity <= oo) {
                                continue;
                            }
                            aa = (bb * 0x1010000 + 257) >>> 16;
                        } else {
                            if (bb != 0) {
                                aa = Math.round(((aa - bb) << 16) / (255 - bb));
                            }
                        }
                    }
                }

                oo = Math.max(oo, opacity);

                // Get the brush color
                var brushColor  = cbrushBuffer[srcIndex];
                var brushColorB = (brushColor >> 16) & 0xff;
                var brushColorG = (brushColor >> 8) & 0xff;
                var brushColorR = brushColor & 0xff;

                if (bb == 0) {
                    //--
                    var dstColor = brushColor;

                    // Stencil test
                    var stencilIndex = stcIndex >> 5;
                    var stencilBit  = 1 << (stcIndex & 0x1f);
                    var stencilMask = stencilBuffer[stencilIndex];
                    if ((stencilMask & stencilBit) == 0) {
                        stencilBuffer[stencilIndex] = stencilMask | stencilBit;
                        dstColor = colorBuffer[dstIndex];
                        stagingBuffer[dstIndex] = dstColor; // stroke starting destination color
                        oo = opacity;
                    }

                    // Expand destination brush color
                    var dstColorA = dstColor >>> 24; // Unsigned shift!
                    var dstColorB = (dstColor >> 16) & 0xff;
                    var dstColorG = (dstColor >> 8) & 0xff;
                    var dstColorR = dstColor & 0xff;

                    // Apply color mixing
                    var invAlpha = 0x10000 - ((dstColorA * loading * 257 + 257) >>> 16);
                    brushColorB = (dstColorB * loading + brushColorB * invAlpha + 0x8000) >> 16;
                    brushColorG = (dstColorG * loading + brushColorG * invAlpha + 0x8000) >> 16;
                    brushColorR = (dstColorR * loading + brushColorR * invAlpha + 0x8000) >> 16;
                    brushColor  = 0xff000000 | (brushColorB << 16) | (brushColorG << 8) | brushColorR;

                    // Update buffers
                    cbrushBuffer[srcIndex] = brushColor;

                    // To fixed16
                    aa = (aa * 0x1010000 + 257) >>> 16;
                }

                aaBuffer[dstIndex] = oo;

                // Get stroke starting destination color
                var _dstColor  = stagingBuffer[dstIndex];
                var _dstColorA = _dstColor >>> 24; // Unsigned shift!
                var _dstColorB = (_dstColor >> 16) & 0xff;
                var _dstColorG = (_dstColor >> 8) & 0xff;
                var _dstColorR = _dstColor & 0xff;

                // Apply brush opacity
                var _invAlpha  = 0x8000 - oo;
                var _outColorA = (        255 * oo + _dstColorA * _invAlpha + 0x4000) >> 15;
                var _outColorB = (brushColorB * oo + _dstColorB * _invAlpha + 0x4000) >> 15;
                var _outColorG = (brushColorG * oo + _dstColorG * _invAlpha + 0x4000) >> 15;
                var _outColorR = (brushColorR * oo + _dstColorR * _invAlpha + 0x4000) >> 15;

                // Get destination color
                var dstColor  = colorBuffer[dstIndex];
                var dstColorA = dstColor >>> 24; // Unsigned shift!
                var dstColorB = (dstColor >> 16) & 0xff;
                var dstColorG = (dstColor >> 8) & 0xff;
                var dstColorR = dstColor & 0xff;

                // Apply coverage alpha
                var invAlpha  = 0x10000 - aa;
                var outColorA = (_outColorA * aa + dstColorA * invAlpha + 0x8000) >> 16;
                var outColorB = (_outColorB * aa + dstColorB * invAlpha + 0x8000) >> 16;
                var outColorG = (_outColorG * aa + dstColorG * invAlpha + 0x8000) >> 16;
                var outColorR = (_outColorR * aa + dstColorR * invAlpha + 0x8000) >> 16;
                
                // Write output
                var outColor = (outColorA << 24) | (outColorB << 16) | (outColorG << 8) | outColorR;
                colorBuffer[dstIndex] = outColor;
            }
        }
    };

    Device.prototype.__drawPencil = function (cx, cy, brushSize, opacity) {
        //--
        //console.log('cx='+cx.toString(16)+',cy='+cy.toString(16));
        var colorBuffer   = this.colorBuffer;
        var stencilBuffer = this.stencilBuffer;
        var stagingBuffer = this.stagingBuffer;
        var brushBuffer   = this.brushBuffers[brushSize-1];
        var aaBuffer      = this.aaBuffer;

        //--
        var brushColor  = this.brushColor;
        var brushColorB = (brushColor >> 16) & 0xff;
        var brushColorG = (brushColor >> 8) & 0xff;
        var brushColorR = brushColor & 0xff;

        //--
        var canvasWidth  = this.canvasWidth;
        var canvasHeight = this.canvasHeight;
        var brushWidth   = brushSize+1;
        var srcWidth     = brushWidth;
        var srcHeight    = brushWidth;

        //--
        var brushWidthH = brushWidth << (16 - 1);
        var dstX = cx - brushWidthH;
        var dstY = cy - brushWidthH;
        var xfrac = dstX & 0xffff;
        var yfrac = dstY & 0xffff;
        dstX >>= 16;
        dstY >>= 16;

        // clamp x coordinate
        var srcX = 0;
        if (dstX < 0) {
            srcX = -dstX;
            srcWidth += dstX;
            dstX = 0;
        }
        var overflowX = (dstX + srcWidth) - canvasWidth;
        if (overflowX > 0) {
            srcWidth -= overflowX;
        }

        // clamp y coordinate
        var srcY = 0;
        if (dstY < 0) {
            srcY = -dstY;
            srcHeight += dstY;
            dstY = 0;
        }
        var overflowY = (dstY + srcHeight) - canvasHeight;
        if (overflowY > 0) {
            srcHeight -= overflowY;
        }

        //--
        var offsetX = dstX - srcX;
        var offsetY = dstY - srcY;

        //--
        var xmax = srcX + srcWidth;
        var ymax = srcY + srcHeight;

        //--
        for (var y = srcY; y < ymax; ++y) {
            //--
            var dstRow = offsetX + (y + offsetY) * canvasWidth;
            var stcRow = offsetX + (y + offsetY) * ((canvasWidth + 31) & ~31);
            //--
            for (var x = srcX; x < xmax; ++x) {
                // Brush shape test
                var aa = coverageMask(brushBuffer, x, y, brushWidth);
                if (aa == 0) {
                    continue;
                }
                //--
                aa = coverageBlend(aa, xfrac, yfrac);
                var alpha = (opacity * aa * 257 + 257) >>> 16;

                // Stencil test
                var dstIndex = x + dstRow;
                var stcIndex = x + stcRow;
                var stencilIndex = stcIndex >> 5;
                var stencilBit  = 1 << (stcIndex & 0x1f);
                var stencilMask = stencilBuffer[stencilIndex];
                if (stencilMask & stencilBit) {
                    if (alpha <= aaBuffer[dstIndex]) {
                        continue;
                    }
                } else {
                    stencilBuffer[stencilIndex] = stencilMask | stencilBit;
                    stagingBuffer[dstIndex] = colorBuffer[dstIndex];
                }
                aaBuffer[dstIndex] = alpha;

                // Get destination color
                var dstColor  = stagingBuffer[dstIndex];
                var dstColorA = dstColor >>> 24;    // Unsigned shift!
                var dstColorB = (dstColor >> 16) & 0xff;
                var dstColorG = (dstColor >> 8) & 0xff;
                var dstColorR = dstColor & 0xff;

                // Calculate output color
                var invAlpha  = 0x8000 - alpha;
                var outColorA = (        255 * alpha + dstColorA * invAlpha + 0x4000) >> 15;
                var outColorB = (brushColorB * alpha + dstColorB * invAlpha + 0x4000) >> 15;
                var outColorG = (brushColorG * alpha + dstColorG * invAlpha + 0x4000) >> 15;
                var outColorR = (brushColorR * alpha + dstColorR * invAlpha + 0x4000) >> 15;

                // Write output
                var outColor = (outColorA << 24) | (outColorB << 16) | (outColorG << 8) | outColorR;
                colorBuffer[dstIndex] = outColor;
            }
        }
    };

    Device.prototype.__erase = function (cx, cy, brushSize, opacity) {
        //--
        //console.log('cx='+cx.toString(16)+',cy='+cy.toString(16));
        var colorBuffer   = this.colorBuffer;
        var stencilBuffer = this.stencilBuffer;
        var stagingBuffer = this.stagingBuffer;
        var brushBuffer   = this.brushBuffers[brushSize-1];
        var aaBuffer      = this.aaBuffer;

        //--
        var canvasWidth  = this.canvasWidth;
        var canvasHeight = this.canvasHeight;
        var brushWidth   = brushSize+1;
        var srcWidth     = brushWidth;
        var srcHeight    = brushWidth;

        //--
        var brushWidthH = brushWidth << (16 - 1);
        var dstX = cx - brushWidthH;
        var dstY = cy - brushWidthH;
        var xfrac = dstX & 0xffff;
        var yfrac = dstY & 0xffff;
        dstX >>= 16;
        dstY >>= 16;

        // clamp x coordinate
        var srcX = 0;
        if (dstX < 0) {
            srcX = -dstX;
            srcWidth += dstX;
            dstX = 0;
        }
        var overflowX = (dstX + srcWidth) - canvasWidth;
        if (overflowX > 0) {
            srcWidth -= overflowX;
        }

        // clamp y coordinate
        var srcY = 0;
        if (dstY < 0) {
            srcY = -dstY;
            srcHeight += dstY;
            dstY = 0;
        }
        var overflowY = (dstY + srcHeight) - canvasHeight;
        if (overflowY > 0) {
            srcHeight -= overflowY;
        }

        //--
        var offsetX = dstX - srcX;
        var offsetY = dstY - srcY;

        //--
        var xmax = srcX + srcWidth;
        var ymax = srcY + srcHeight;

        //--
        for (var y = srcY; y < ymax; ++y) {
            //--
            var dstRow = offsetX + (y + offsetY) * canvasWidth;
            var stcRow = offsetX + (y + offsetY) * ((canvasWidth + 31) & ~31);
            //--
            for (var x = srcX; x < xmax; ++x) {
                // Brush shape test
                var aa = coverageMask(brushBuffer, x, y, brushWidth);
                if (aa == 0) {
                    continue;
                }

                //--
                aa = coverageBlend(aa, xfrac, yfrac);
                var alpha = (opacity * aa * 257 + 257) >>> 16;

                // Stencil test
                var dstIndex = x + dstRow;
                var stcIndex = x + stcRow;
                var stencilIndex = stcIndex >> 5;
                var stencilBit  = 1 << (stcIndex & 0x1f);
                var stencilMask = stencilBuffer[stencilIndex];
                if (stencilMask & stencilBit) {
                    if (alpha <= aaBuffer[dstIndex]) {
                        continue;
                    }
                } else {
                    stencilBuffer[stencilIndex] = stencilMask | stencilBit;
                    stagingBuffer[dstIndex] = colorBuffer[dstIndex];
                }
                aaBuffer[dstIndex] = alpha;

                // Get destination alpha
                var dstColor  = stagingBuffer[dstIndex];
                var dstColorA = dstColor >>> 24;    // Unsigned shift!
                var dstColorB = (dstColor >> 16) & 0xff;
                var dstColorG = (dstColor >> 8) & 0xff;
                var dstColorR = dstColor & 0xff;

                // Calculate output color
                var invAlpha  = 0x8000 - alpha;
                var outColorA = (dstColorA * invAlpha + 0x4000) >> 15;
                var outColorB = (dstColorB * invAlpha + 0x4000) >> 15;
                var outColorG = (dstColorG * invAlpha + 0x4000) >> 15;
                var outColorR = (dstColorR * invAlpha + 0x4000) >> 15;

                // Write output
                var outColor = (outColorA << 24) | (outColorB << 16) | (outColorG << 8) | outColorR;
                colorBuffer[dstIndex] = outColor;
            }
        }
    };

    Device.prototype.updateBackBuffer = function () {
        //--
        var bgColor = this.bgColor;
        var backBuffer = this.backBuffer;
        for (var i = 0, n = backBuffer.length; i < n; ++i) {
            backBuffer[i] = bgColor;
        }

        //--
        var canvasWidth  = this.canvasWidth;
        var canvasHeight = this.canvasHeight;
        var layers = this.layers;
        var activeLayerIndex = this.activeLayerIndex;
        var canvasRect = this.canvasRect;

        //--
        for (var i = 0; i < activeLayerIndex; ++i) {
            //--
            var layer = layers[i];
            if (layer.visible) {
                layer.blend(backBuffer, backBuffer, layer.colorBuffer, layer.opacity, 
                            canvasWidth, 0, 0, canvasWidth, canvasHeight);
            }
        }
    };

    Device.prototype.clear = function () {
        //--
        this.displayBuffer.set(this.backBuffer);
    };

    Device.prototype.present = function (x0, y0, x1, y1) {
        //--
        var canvasWidth = this.canvasWidth;
        var backBuffer = this.backBuffer;
        var displayBuffer = this.displayBuffer;
        var layers = this.layers;

        //--
        for (var i = this.activeLayerIndex, n = layers.length; i < n; ++i) {
            //--
            var layer = layers[i];
            if (layer.visible) {
                layer.blend(displayBuffer, backBuffer, layer.colorBuffer, layer.opacity, 
                            canvasWidth, x0, y0, x1, y1);
                backBuffer = displayBuffer;
            }
        }

        //--
        this.context.putImageData(this.displayImage, 0, 0, x0, y0, x1 - x0, y1 - y0);
    };

    Device.prototype.beginStroke = function (pageX, pageY, pressure) {
        //--
        app.trace('{"id":"beginStroke","pageX":' + pageX + ',"pageY":' + pageY + ',"pressure":'+ pressure + '}');

        //--
        if (this.autoColorPicker) {
            var color = this.getImageColor(pageX, pageY);
            app.colorPicker.setColor(color);
        }

        //--
        var coords = this.toCanvasCoords(pageX, pageY);
        this.prevCoords.x = Math.round(coords.x * 0x10000);
        this.prevCoords.y = Math.round(coords.y * 0x10000);

        //--
        var pressure = Math.round(pressure * 0x10000);
        this.prevBrushSize = this.calcBrushSize(pressure);
        this.prevOpacity = this.calcOpacity(pressure);

        //--
        this.isStrokeStart = true;
    };

    Device.prototype.moveStroke = function (pageX, pageY, pressure) {
        //--
        app.trace('{"id":"moveStroke","pageX":' + pageX + ',"pageY":' + pageY + ',"pressure":'+ pressure + '}');

        //--
        var coords = this.toCanvasCoords(pageX, pageY);
        var x = Math.round(coords.x * 0x10000);
        var y = Math.round(coords.y * 0x10000);

        //--
        var pressure = Math.round(pressure * 0x10000);
        var brushSize = this.calcBrushSize(pressure);
        var opacity = this.calcOpacity(pressure);

        //--
        this.drawLine(x, y, brushSize, opacity);
    };

    Device.prototype.endStroke = function () {
        //--
        app.trace('{"id":"endStroke"}');

        //--
        this.drawPoint(this.prevCoords.x, this.prevCoords.y, this.prevBrushSize, this.prevOpacity);

        //--
        this.dirtyCanvas();

        //--
        if (this.paintTool == PaintTool.BRUSH) {
            app.cleanBrushTool.isDirty(true);
        }
    };

    Device.prototype.drawImage = function (url) {
        //--
        app.trace('{"id":"drawImage","url":' + url + '}');
        //--
        var that = this;

        var img = new Image();
        img.onload = function () {
            //--
            var dstWidth  = that.canvasWidth;
            var dstHeight = that.canvasHeight;

            //--
            var scaleX = dstWidth / img.width;
            var scaleY = dstHeight / img.height;
            var scale  = Math.min(scaleX, scaleY);
            var width  = Math.round(img.width * scale);
            var height = Math.round(img.height * scale);
            var x0 = (dstWidth - width) >> 1;
            var y0 = (dstHeight - height) >> 1;

            //--
            var canvas  = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.width  = width;
            canvas.height = height;
            context.drawImage(img, 0, 0, width, height);
            var srcImgData = context.getImageData(0, 0, width, height);

            //--
            var srcPixels = srcImgData.data;
            var colorBuffer = that.colorBuffer;
            for (var y = 0; y < height; ++y) {
                //--
                var srcRow = y * width;
                var dstRow = x0 + (y + y0) * dstWidth;
                //--
                for (var x = 0; x < width; ++x) {
                    //--
                    var dstIndex = x + dstRow;
                    var srcIndex = (x + srcRow) * 4;
                    var colorR = srcPixels[srcIndex + 0];
                    var colorG = srcPixels[srcIndex + 1];
                    var colorB = srcPixels[srcIndex + 2];
                    var colorA = srcPixels[srcIndex + 3];
                    var color = (colorA << 24) | (colorB << 16) | (colorG << 8) | colorR;
                    //--
                    colorBuffer[dstIndex] = color;
                }
            }

            //--
            that.present(x0, y0, x0 + width, x0 + height);
            app.dirtyRects.add(x0 >> 5, y0 >> 5, (x0 + width + 31) >> 5, (y0 + height + 31) >> 5);
            that.dirtyCanvas();
        };

        img.src = url;
    };

    Device.prototype.dirtyCanvas = function () {
        //--
        var dirtyRects = this.dirtyRects.clear();
        do {
            //--
            this.clearStencil(dirtyRects.buffer, dirtyRects.size);
            this.history.addLayerDraw(dirtyRects.buffer, dirtyRects.size);
            dirtyRects = dirtyRects.next;
        } while (dirtyRects);

        //--
        var layer = this.layers[this.activeLayerIndex];
        layer.previewUpdate = true;
        if (this.layerPanel.visible) {
            this.layerPanel.updatePreviews();
        }

        //--
        this.dirtyRectsPos.x = -1;
        this.dirtyRectsPos.y = -1;

        //--
        this.isCanvasDirty = true;
    };

    Device.prototype.clearStencil = function (dirtyRects, numRects) {
        //--
        var canvasWidth   = this.canvasWidth;
        var canvasHeight  = this.canvasHeight;
        var stencilPitch  = (canvasWidth + 31) >> 5;
        var stencilBuffer = this.stencilBuffer;

        //--
        for (var r = 0; r < numRects; ++r) {
            //--
            var rect = dirtyRects[r];
            if (rect == 0) {
                continue;
            }
            //--
            var x0 = rect & 0xff;
            var y0 = Math.min(((rect >> 8) & 0xff) << 5, canvasHeight);
            var x1 = (rect >> 16) & 0xff;
            var y1 = Math.min((rect >>> 24) << 5, canvasHeight);
            //--
            for (var y = y0; y < y1; ++y) {
                for (var i = x0 + y * stencilPitch, i1 = i + x1; i < i1; ++i) {
                    stencilBuffer[i] = 0x0;
                }
            }
        }
    };

    Device.prototype.openEyeDropper = function (touchPos) {
        //--
        this.eyeDropperTimeoutID = null;
        this.eyeDropper.open(true);
        this.eyeDropper.bind(this, touchPos);
    };

    Device.prototype.toCanvasCoords = function (pageX, pageY) {
        //--
        if (this.positionChanged) {
            this.screenToCanvas = utils.matrix.fromElement(this.canvas).inverse();
            this.screenToCanvas = this.screenToCanvas.multiply(utils.matrix.translation(0.5, 0.5));
            //console.log("transform="+this.screenToCanvas.toStr());
            this.positionChanged = false;
        }
        return this.screenToCanvas.transformPoint(pageX, pageY);
    };

    Device.prototype.onTouch = function (event) {
        //--
        var that = this;
        //console.log("etype="+event.etype+",pageX="+event.touches[0].pageX+",pageY="+event.touches[0].pageY);
                
        //--
        if (this.eyeDropperTimeoutID) {
            clearTimeout(this.eyeDropperTimeoutID);
            this.eyeDropperTimeoutID = null;
        }

        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            var touchPos = event.touches[0];
            //--
            if (this.handTool.enabled) {
                this.handTool.bind(this);
                return;
            }
            //--
            if (this.eyeDropper.enabled) {
                this.eyeDropper.bind(this, touchPos);
                return;
            }
            //--
            if (this.isLayerWriteEnabled) {
                var pressure = touchPos.force ? touchPos.force : 0.5;
                this.beginStroke(touchPos.pageX, touchPos.pageY, pressure);
            }
            //--
            this.eyeDropperTimeoutID = setTimeout(function () { that.openEyeDropper(touchPos); }, 
                                                  Globals.EYEDROPPER_TIMEOUT);
            break;
        case TouchEvent.MOVE:
            //--
            if (this.isLayerWriteEnabled) {
                var touchPos = event.touches[0];
                var pressure = touchPos.force ? touchPos.force : 0.5;
                setTimeout(function () { that.moveStroke(touchPos.pageX, touchPos.pageY, pressure); }, 0);
            }
            break;
        case TouchEvent.END:
        case TouchEvent.CANCEL:
            //--
            if (this.isLayerWriteEnabled) {
                setTimeout(function () { that.endStroke(); }, 0);
            }
            break;
        }
    };

    Device.prototype.updateTransform = function (cvTransform) {
        //--
        app.trace('{"id":"updateTransform","tx":' + cvTransform.tx + ',"ty":' + cvTransform.ty + 
                                          ',"s":' + cvTransform.s + ',"r":' + cvTransform.r + '}');

        //--
        var rot_deg = cvTransform.r * (180 / Math.PI);
        var transform = "translate(" + cvTransform.tx + "px," + cvTransform.ty + "px) " +
                        "scale(" + cvTransform.s + "," + cvTransform.s + ") " +
                        "rotate(" + rot_deg + "deg)";
        //console.log(transform);
        this.canvas.style.webkitTransform = transform;
        //--
        this.cvTransform = cvTransform;
        this.positionChanged = true;
    };

    paletta.Device = Device;
}());
