/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals    = paletta.Globals;
    var TouchEvent = utils.TouchEvent;
    var BlendMode  = paletta.BlendMode;

    //--
    var LAYER_SIZE = 100;
    var LAYER_PREVIEW_SIZE = 96;

    var LayerPanel = function () {
        //--
        this.device = null;
        this.history = null;
        this.layerPanel = null;
        this.container = null;
        this.blendOps = new paletta.BlendOps();
        this.prevPos = {x:0, y:0};
        this.visible = false;
        this.pageSlider = new paletta.PageSlider();

        //--
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.layers = null;
        this.activeLayerIndex = -1;
        this.IDs = 0;
        this.previewBuffer = null;
        this.previewBuffer32 = null;
        this.bubbleLayerIndex = -1;

        //--
        this.selectLayerBlendMode = new paletta.BubbleCtrl(96, 48, 1/6, 0, BlendMode.MAXVALUE - 1);
        this.selectLayerOpacity = new paletta.BubbleCtrl(48, 48, 1/2, 0, 100);
    };

    LayerPanel.prototype.init = function () {
        //--
        var that = this;

        //--
        this.device  = app.device;
        this.history = app.history;
        this.layerPanel = document.getElementById('layers');
        this.container = document.getElementById('layers-container');

        //--
        this.selectLayerOpacity.init(
            'selectBrushOpacity',
            function (handler) {
                that.pageSlider.setTouchHandler(handler);
            },
            function () {
                var layer = that.layers[that.bubbleLayerIndex];
                return (layer.opacity * 100 + 0x8000) >> 16;
            },
            function (value) {
                that.setLayerOpacity(that.bubbleLayerIndex, Math.floor((value * 0x10000 + 50) / 100));
            },
            function (value) {
                var layer = that.layers[that.bubbleLayerIndex];
                that.__renderLayerOpacity(layer, Math.floor((value * 0x10000 + 50) / 100));
            }
        );

        //--
        this.selectLayerBlendMode.init(
            'selectLayerBlendMode',
            function (handler) {
                that.pageSlider.setTouchHandler(handler);
            },
            function () {
                var layer = that.layers[that.bubbleLayerIndex];
                return layer.blendMode;
            },
            function (value) {
                that.setLayerBlendMode(that.bubbleLayerIndex, value);
            },
            function (value) {
                var layer = that.layers[that.bubbleLayerIndex];
                that.__renderLayerBlendMode(layer, value);
            }
        );

        //--
        this.blendOps.init();

        //--
        var page = document.getElementById('layers-page');
        this.pageSlider.init(page, "layer", LAYER_SIZE);
        this.pageSlider.onClick = function (event, index, pageX, pageY) { that.onLayerClick(event, index, pageX, pageY); };
        this.pageSlider.onTouch = function (event, index) { return that.onLayerTouch(event, index); };
        this.pageSlider.onMove  = function (from, to) { that.onLayerMove(from, to); };

        //--
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        this.previewBuffer = ctx.createImageData(LAYER_PREVIEW_SIZE, LAYER_PREVIEW_SIZE);
        this.previewBuffer32 = new Uint32Array(this.previewBuffer.data.buffer);

        //--
        this.__renderLayerPreview = utils.isLittleEndian() ? this.__renderLayerPreviewLE : this.__renderLayerPreviewBE;

        //--
        var closeButton = document.getElementById('layers-close');
        closeButton.addEventListener('click', function (event) { app.toolbar.close(that); }, false);

        //--
        var addButton = document.getElementById('layers-add');
        addButton.addEventListener('click', function (event) { that.addLayer(true); }, false);

        //--
        var duplicateButton = document.getElementById('layers-duplicate');
        duplicateButton.addEventListener('click', function (event) { that.duplicateLayer(that.activeLayerIndex); }, false);

        //--
        var mergeButton = document.getElementById('layers-merge');
        mergeButton.addEventListener('click', function (event) { that.mergeLayer(that.activeLayerIndex); }, false);

        //--
        var deleteButton = document.getElementById('layers-delete');
        deleteButton.addEventListener('click', function (event) { that.deleteLayer(that.activeLayerIndex); }, false);

        //--
        app.touch.attach(this.layerPanel, TouchEvent.START | TouchEvent.MOVE, function (event) {that.__onTouch(event);});
    };

    LayerPanel.prototype.reset = function (canvasWidth, canvasHeight) {
        //--
        this.canvasWidth  = canvasWidth;
        this.canvasHeight = canvasHeight;

        //--
        this.pageSlider.reset();
        this.layers = [];
        this.activeLayerIndex = -1;
        this.IDs = 0;
    };

    LayerPanel.prototype.open = function () {
        //--
        app.moveToTopWindow(this.layerPanel);
        this.layerPanel.style.display = 'block';
        this.visible = true;

        //--
        this.updatePreviews();

        //--
        return true;
    };

    LayerPanel.prototype.close = function () {
        //--
        this.layerPanel.style.display = 'none';
        app.moveToBottomWindow(this.layerPanel);
        this.visible = false;
    };

    LayerPanel.prototype.updatePreviews = function () {
        //--
        var layers = this.layers;
        for (var i = 0, n = layers.length; i < n; ++i) {
            var layer = layers[i];
            if (layer.previewUpdate) {
                this.__renderLayerPreview(layer);
            }
        }
    };

    LayerPanel.prototype.onLayerClick = function (event, index, pageX, pageY) {
        //--
        var that = this;

        //--
        var layerIndex = this.layers.length - 1 - index;

        //--
        switch (event.target.className) {
        case 'layer-opacity':
            this.bubbleLayerIndex = layerIndex;
            this.selectLayerOpacity.onClick(event);
            break;
        case 'layer-blendMode':
            this.bubbleLayerIndex = layerIndex;
            this.selectLayerBlendMode.onClick(event);
            break;
        case 'layer-visible':
            this.toggleLayerVisible(layerIndex);
            break;
        case 'layer-locked':
            this.toggleLayerLocked(layerIndex);
            break;
        case 'layer-preview':
            this.setActiveLayer(layerIndex);
            break;
        }
    };

    LayerPanel.prototype.onLayerTouch = function (event, index) {
        //--
        var that = this;

        //--
        var layerIndex = this.layers.length - 1 - index;
        var layer = this.layers[layerIndex];

        //--
        switch (event.target.className) {
        case 'layer-opacity':
            this.bubbleLayerIndex = layerIndex;
            this.selectLayerOpacity.onTouch(event);
            return true;
        case 'layer-blendMode':
            this.bubbleLayerIndex = layerIndex;
            this.selectLayerBlendMode.onTouch(event);
            return true;
        }
        //--
        return false;
    };

    LayerPanel.prototype.__onTouch = function (event) {
        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            app.moveToTopWindow(this.layerPanel);
            var rect = this.layerPanel.getBoundingClientRect();
            this.prevPos.x = rect.left - event.touches[0].pageX;
            this.prevPos.y = rect.top - event.touches[0].pageY;
            break;
        case TouchEvent.MOVE:
            //--
            var left = this.prevPos.x + event.touches[0].pageX;
            var top = this.prevPos.y + event.touches[0].pageY;
            this.layerPanel.style.left = left + 'px';
            this.layerPanel.style.top = top + 'px';
            this.pageSlider.positionChanged();
            break;
        case TouchEvent.END:
        case TouchEvent.CANCEL:
            //--
            break;
        }
        event.stopPropagation();
    };

    LayerPanel.prototype.onLayerMove = function (from, to) {
        //--
        var lastIndex = this.layers.length - 1;
        this.moveLayer(lastIndex - from, lastIndex - to, false);
    };

    LayerPanel.prototype.getLayers = function () {
        return this.layers;
    };

    LayerPanel.prototype.getActiveLayerIndex = function () {
        return this.activeLayerIndex;
    };

    LayerPanel.prototype.getActiveLayer = function () {
        return this.layers[this.activeLayerIndex];
    };

    LayerPanel.prototype.getLayer = function (index) {
        return this.layers[index];
    };

    LayerPanel.prototype.__createLayer = function (opacity, blendMode, visible, locked, colorBuffer) {
        //--
        var layer = {
            ID: this.IDs++,
            opacity: opacity,
            blendMode: blendMode,
            colorBuffer: null,
            visible: visible,
            locked: locked,
            blend: null,
            merge: null,
            previewUpdate: false,
            __div: null,
        };

        //--
        var newColorBuffer = new Uint32Array(this.canvasWidth * this.canvasHeight);
        if (colorBuffer) {
            newColorBuffer.set(colorBuffer);
        }
        layer.colorBuffer = newColorBuffer;

        //--
        layer.blend = this.blendOps.getBlendFunction(blendMode);
        layer.merge = this.blendOps.getMergeFunction(blendMode);

        //--
        return layer;
    };

    LayerPanel.prototype.__createLayerDiv = function (layer, index) {
        //--
        var layerDiv = document.createElement('div');
        layerDiv.id = "layer-"+layer.ID;
        layerDiv.className = 'layer';

        //--
        var layerVisible = document.createElement('div');
        layerVisible.className = 'layer-visible';
        layerDiv.appendChild(layerVisible);

        //--
        var layerOpacity = document.createElement('div');
        layerOpacity.className = 'layer-opacity';
        layerDiv.appendChild(layerOpacity);

        //--
        var layerBlendMode = document.createElement('div');
        layerBlendMode.className = 'layer-blendMode';
        layerDiv.appendChild(layerBlendMode);

        //--
        var layerThumb = document.createElement('div');
        layerThumb.className = 'layer-thumb';
        layerDiv.appendChild(layerThumb);

        //--
        var layerPreview = document.createElement('canvas');
        layerPreview.className = 'layer-preview';
        layerPreview.width = LAYER_PREVIEW_SIZE;
        layerPreview.height = LAYER_PREVIEW_SIZE;
        layerDiv.appendChild(layerPreview);

        //--
        var layerLocked = document.createElement('div');
        layerLocked.className = 'layer-locked';
        layerDiv.appendChild(layerLocked);

        //--
        var layerNumber = document.createElement('div');
        layerNumber.className = 'layer-number';
        layerNumber.innerHTML = index;
        layerDiv.appendChild(layerNumber);

        //--
        layer.__div = layerDiv;
        return layerDiv;
    };

    LayerPanel.prototype.__renderLayer = function (layer, index) {
        //--
        this.__renderLayerNumber(layer, index);
        this.__renderLayerVisible(layer, layer.visible);
        this.__renderLayerLocked(layer, layer.locked);
        this.__renderLayerOpacity(layer, layer.opacity);
        this.__renderLayerBlendMode(layer, layer.blendMode);
        this.__renderLayerPreview(layer);
    };

    LayerPanel.prototype.__renderLayerNumber = function (layer, index) {
        //--
        layer.__div.getElementsByClassName('layer-number')[0].innerHTML = index;
    };

    LayerPanel.prototype.__renderLayerVisible = function (layer, visible) {
        //--
        layer.__div.getElementsByClassName('layer-visible')[0].style.opacity = visible ? 1.0 : 0.5;
    };

    LayerPanel.prototype.__renderLayerLocked = function (layer, locked) {
        //--
        layer.__div.getElementsByClassName('layer-locked')[0].style.opacity = locked ? 1.0 : 0.5;
    };

    LayerPanel.prototype.__renderLayerOpacity = function (layer, opacity) {
        //--
        var color   = '#DAFF7F';
        var bgColor = '#7f7f7f';

        var src = "none";
        if (opacity != 0x10000) {
            if (opacity < 0x8000) {
                var degree = 90 + ((360 * opacity + 0x8000) >> 16);
                src = "linear-gradient(" + degree + "deg, transparent 50%, " + bgColor + " 50%), linear-gradient(90deg, " + bgColor + " 50%, transparent 50%)";
            } else if (opacity == 0x8000) {
                src = "linear-gradient(90deg, " + bgColor + " 50%, transparent 50%)";
            } else {
                var degree = 90 + ((360 * (opacity - 0x8000) + 0x8000) >> 16);
                src = "linear-gradient(" + degree + "deg, transparent 50%, " + color + " 50%), linear-gradient(90deg, " + bgColor + " 50%, transparent 50%)";
            }
        }
        layer.__div.getElementsByClassName('layer-opacity')[0].style.backgroundImage = src;
    };

    LayerPanel.prototype.__renderLayerBlendMode = function (layer, blendMode) {
        //--
        layer.__div.getElementsByClassName('layer-blendMode')[0].innerHTML = this.blendOps.getBlendModeAbr(blendMode);
    };

    LayerPanel.prototype.__renderLayerPreviewLE = function (layer) {
        //--
        var srcWidth    = this.canvasWidth;
        var srcHeight   = this.canvasHeight;
        var colorBuffer = layer.colorBuffer;
        var previewBuffer32 = this.previewBuffer32;

        //--
        var size   = Math.max(srcWidth, srcHeight);
        var width  = Math.round(LAYER_PREVIEW_SIZE * srcWidth / size);
        var height = Math.round(LAYER_PREVIEW_SIZE * srcHeight / size);
        var x0 = (LAYER_PREVIEW_SIZE - width) >> 1;
        var y0 = (LAYER_PREVIEW_SIZE - height) >> 1;
        var x1 = x0 + width;
        var y1 = y0 + height;
        var dst_to_src_x = srcWidth / width;
        var dst_to_src_y = srcHeight / height;

        //--
        for (var y = y0; y < y1; ++y) {
            //--
            var dstRow = y * LAYER_PREVIEW_SIZE;
            var srcRow = Math.round((y - y0) * dst_to_src_y) * srcWidth;
            //--
            for (var x = x0; x < x1; ++x) {
                //--
                var srcX = Math.round((x - x0) * dst_to_src_x);
                previewBuffer32[x + dstRow] = colorBuffer[srcX + srcRow];
            }
        }

        //--
        var canvas = layer.__div.getElementsByClassName('layer-preview')[0];
        var ctx = canvas.getContext('2d');
        ctx.putImageData(this.previewBuffer, 0, 0);

        //-
        layer.previewUpdate = false;
    };

    LayerPanel.prototype.__renderLayerPreviewBE = function (layer) {
        //--
        var srcWidth    = this.canvasWidth;
        var srcHeight   = this.canvasHeight;
        var colorBuffer = layer.colorBuffer;
        var previewBuffer32 = this.previewBuffer32;

        //--
        var size   = Math.max(srcWidth, srcHeight);
        var width  = Math.round(LAYER_PREVIEW_SIZE * srcWidth / size);
        var height = Math.round(LAYER_PREVIEW_SIZE * srcHeight / size);
        var x0 = (LAYER_PREVIEW_SIZE - width) >> 1;
        var y0 = (LAYER_PREVIEW_SIZE - height) >> 1;
        var x1 = x0 + width;
        var y1 = y0 + height;
        var dst_to_src_x = srcWidth / width;
        var dst_to_src_y = srcHeight / height;

        //--
        for (var y = y0; y < y1; ++y) {
            //--
            var dstRow = y * LAYER_PREVIEW_SIZE;
            var srcRow = Math.round((y - y0) * dst_to_src_y) * srcWidth;
            //--
            for (var x = x0; x < x1; ++x) {
                //--
                var srcX = Math.round((x - x0) * dst_to_src_x);
                var srcColor = colorBuffer[srcX + srcRow];
                var swapped = ((srcColor >> 24) & 0xff)
                            | ((srcColor >>  8) & 0xff00)
                            | ((srcColor <<  8) & 0xff0000)
                            | ((srcColor << 24) & 0xff000000);
                previewBuffer32[x + dstRow] = swapped;
            }
        }

        //--
        var canvas = layer.__div.getElementsByClassName('layer-preview')[0];
        var ctx = canvas.getContext('2d');
        ctx.putImageData(this.previewBuffer, 0, 0);

        //-
        layer.previewUpdate = false;
    };

    LayerPanel.prototype.newLayer = function (opacity, blendMode, visible, locked, colorBuffer, history) {
        //--
        var layer = this.__createLayer(opacity, blendMode, visible, locked, colorBuffer);
        var index = this.layers.push(layer) - 1;

        //--
        var layerDiv = this.__createLayerDiv(layer, index);
        this.__renderLayer(layer, index);
        this.pageSlider.addItem(0, layerDiv);

        //--
        if (history) {
            this.history.addLayerNew(index);
        }

        //--
        this.setActiveLayer(index);
    };

    LayerPanel.prototype.addLayer = function (history) {
        //--
        this.newLayer(0x10000, BlendMode.NORMAL, true, false, null, history);
    };

    LayerPanel.prototype.duplicateLayer = function (index) {
        //--
        var layer = this.layers[index];

        //--
        this.newLayer(layer.opacity, layer.blendMode, layer.visible, layer.locked, layer.colorBuffer, true);

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.mergeLayer = function (index) {
        //--
        if (index == 0) {
            return;
        }

        //--
        var srcLayer = this.layers[index];
        var dstLayer = this.layers[index - 1];

        //--
        var copyLayer = this.__createLayer(dstLayer.opacity, dstLayer.blendMode, dstLayer.visible, dstLayer.locked, dstLayer.colorBuffer);
        this.history.addLayerMerge(index, srcLayer, copyLayer);

        //--
        srcLayer.merge(
            dstLayer.colorBuffer,
            dstLayer.colorBuffer,
            srcLayer.colorBuffer,
            srcLayer.opacity,
            this.canvasWidth,
            0,
            0,
            this.canvasWidth,
            this.canvasHeight
        );

        //--
        this.pageSlider.removeItem(this.layers.length - 1 - index);
        this.layers.splice(index, 1);

        //--
        //--
        var layers = this.layers;
        for (var i = index, n = layers.length; i < n; ++i) {
            this.__renderLayerNumber(layers[i], i);
        }
        this.__renderLayerPreview(dstLayer);

        //--
        var activeLayerIndex = index - 1;
        this.setActiveLayer(activeLayerIndex);

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.unmergeLayer = function (indexFrom, layerFrom, layerTo) {
        //--
        this.history.addLayerUnmerge(indexFrom);

        //--
        var dstLayer = this.layers[indexFrom - 1];
        dstLayer.colorBuffer.set(layerTo.colorBuffer);

        //--
        this.layers.splice(indexFrom, 0, layerFrom);
        this.pageSlider.addItem(this.layers.length - 1 - indexFrom, layerFrom.__div);

        //--
        var layers = this.layers;
        for (var i = indexFrom + 1, n = layers.length; i < n; ++i) {
            this.__renderLayerNumber(layers[i], i);
        }
        this.__renderLayerPreview(dstLayer);

        //--
        this.setActiveLayer(indexFrom);

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.insertLayer = function (index, layer) {
        //--
        this.history.addLayerNew(index);

        //--
        this.layers.splice(index, 0, layer);
        this.pageSlider.addItem(this.layers.length - 1 - index, layer.__div);

        //--
        var layers = this.layers;
        for (var i = index + 1, n = layers.length; i < n; ++i) {
            this.__renderLayerNumber(layers[i], i);
        }

        //--
        this.setActiveLayer(index);

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.deleteLayer = function (index) {
        //--
        if (this.layers.length == 1) {
            return; // Always keep at least one layer
        }
        var layer = this.layers[index];

        //--
        this.history.addLayerDelete(index, layer);

        //--
        this.pageSlider.removeItem(this.layers.length - 1 - index);
        this.layers.splice(index, 1);

        //--
        var layers = this.layers;
        for (var i = index, n = layers.length; i < n; ++i) {
            this.__renderLayerNumber(layers[i], i);
        }

        //--
        var activeLayerIndex = Math.max(index - 1, 0);
        this.setActiveLayer(activeLayerIndex);

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.setActiveLayer = function (index) {
        //--
        console.assert(index >= 0 & index < this.layers.length);
        if (this.activeLayerIndex == index) {
            return;
        }

        //--
        var layer = this.layers[index];

        //--
        if (this.activeLayerIndex != -1) {
            var oldLayer = this.layers[this.activeLayerIndex];
            oldLayer.__div.style.backgroundColor = '#7f7f7f';
        }   
        layer.__div.style.backgroundColor = '#646464';

        //--
        this.device.setLayerWriteEnabled(!layer.locked && layer.visible);
        this.device.setActiveLayer(index);

        //--
        this.history.setActiveLayer(layer);

        //--
        this.activeLayerIndex = index;
    };

    LayerPanel.prototype.toggleLayerLocked = function (index) {
        //--
        var layer = this.layers[index];

        //--
        var locked = !layer.locked;
        layer.locked = locked;
        this.__renderLayerLocked(layer, locked);

        //--
        if (index == this.activeLayerIndex) {
            this.device.setLayerWriteEnabled(!locked && layer.visible);
        }
    };

    LayerPanel.prototype.toggleLayerVisible = function (index) {
        //--
        var layer = this.layers[index];

        //--
        this.history.addLayerVisible(index);

        //--
        var visible = !layer.visible;
        layer.visible = visible;
        this.__renderLayerVisible(layer, visible);

        //--
        if (index == this.activeLayerIndex) {
            this.device.setLayerWriteEnabled(!layer.locked && visible);
        }

        //--
        if (index < this.activeLayerIndex) {
            this.device.updateBackBuffer();
        }

        //--
        if ((this.activeLayerIndex + 1) == this.layers.length && !visible) {
            this.device.clear();
        }

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.setLayerOpacity = function (index, opacity) {
        //--
        var layer = this.layers[index];

        //--
        this.history.addLayerOpacity(index, layer.opacity);

        //--
        layer.opacity = opacity;
        this.__renderLayerOpacity(layer, opacity);

        //--
        if (index < this.activeLayerIndex) {
            this.device.updateBackBuffer();
        }

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.setLayerBlendMode = function (index, blendMode) {
        //--
        var layer = this.layers[index];

        //--
        this.history.addLayerBlendMode(index, layer.blendMode);

        //--
        layer.blendMode = blendMode;
        layer.blend = this.blendOps.getBlendFunction(blendMode);
        layer.merge = this.blendOps.getMergeFunction(blendMode);
        this.__renderLayerBlendMode(layer, blendMode);

        //--
        if (index < this.activeLayerIndex) {
            this.device.updateBackBuffer();
        }

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.moveLayer = function (fromIndex, toIndex, updateDisplayList) {
        //--
        this.history.addLayerMove(fromIndex, toIndex);

        //--
        var layers = this.layers;
        var fromLayer = layers[fromIndex];

        //--
        var step = (toIndex >= fromIndex) ? 1 : -1;
        for (var i = fromIndex; i != toIndex; i += step) {
            var layer = layers[i + step];
            this.layers[i] = layer;
            this.__renderLayerNumber(layer, i);
        }
        this.layers[toIndex] = fromLayer;
        this.__renderLayerNumber(fromLayer, toIndex);

        //--
        if (updateDisplayList) {
            var lastIndex = this.layers.length - 1;
            this.pageSlider.moveItem(lastIndex - fromIndex, lastIndex - toIndex);
        }

        //--
        if (fromIndex == this.activeLayerIndex) {
            this.setActiveLayer(toIndex);
        } else if (toIndex == this.activeLayerIndex) {
            this.setActiveLayer(fromIndex);
        }

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    LayerPanel.prototype.fillLayer = function (index, color) {
        //--
        var layer = this.layers[index];

        //--
        var colorBuffer = layer.colorBuffer;
        for (var i = 0, n = colorBuffer.length; i < n; ++i) {
            colorBuffer[i] = color;
        }

        //--
        this.history.addLayerDraw(this.device.fullDirtyRect);

        //--
        this.device.present(0, 0, this.canvasWidth, this.canvasHeight);
    };

    paletta.LayerPanel = LayerPanel;
}());
