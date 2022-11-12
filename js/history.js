/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var MAX_BUFFER_SIZE = 40000000; // 40 MB

    var RecordType = {
        LAYER_NEW:      0x0,
        LAYER_DELETE:   0x1,
        LAYER_DRAW:     0x2,
        LAYER_MOVE:     0x3,
        LAYER_VISIBLE:  0x4,
        LAYER_OPACITY:  0x5,
        LAYER_BLENDMODE:0x6,
        LAYER_MERGE:    0x7,
        LAYER_UNMERGE:  0x8,
    };

    var History = function () {
        //--
        this.layerPanel = null;

        //--
        this.activeLayer = 0;
        this.colorBufferPrev = null;

        //--
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.changes = null;
        this.index = 0;
        this.replaceIndex = -1;
        this.storageSize = 0;
    };

    History.prototype.init = function () {
        //--
        this.layerPanel = app.layerPanel;
    };

    History.prototype.reset = function (canvasWidth, canvasHeight) {
        //--
        this.canvasWidth  = canvasWidth;
        this.canvasHeight = canvasHeight;

        //--
        this.changes = [];
        this.index = 0;
        this.storageSize = 0;
        this.replaceIndex = -1;

        //--
        app.historyPrev.enable(false);
        app.historyNext.enable(false);
    };

    History.prototype.setActiveLayer = function (layer) {
        //--
        this.activeLayer = layer;
        this.colorBufferPrev = new Uint32Array(layer.colorBuffer);
    };

    History.prototype.addLayerNew = function (index) {
        //--
        this.__add(RecordType.LAYER_NEW, index, 8);
    };

    History.prototype.__revertLayerNew = function (index, change) {
        //--
        this.replaceIndex = index;
        this.layerPanel.deleteLayer(change.data);
        this.replaceIndex = -1;
    };

    History.prototype.addLayerDelete = function (index, layer) {
        //--
        this.__add(RecordType.LAYER_DELETE, {index:index, layer:layer}, 2 * 8);
    };

    History.prototype.__revertLayerDelete = function (index, change) {
        //--
        this.replaceIndex = index;
        this.layerPanel.insertLayer(change.data.index, change.data.layer);
        this.replaceIndex = -1;
    };

    History.prototype.addLayerMerge = function (indexFrom, layerFrom, layerTo) {
        //--
        this.__add(RecordType.LAYER_MERGE, {indexFrom:indexFrom, layerFrom:layerFrom, layerTo:layerTo}, 3 * 8);
    };

    History.prototype.__revertLayerMerge = function (index, change) {
        //--
        this.replaceIndex = index;
        this.layerPanel.unmergeLayer(change.data.indexFrom, change.data.layerFrom, change.data.layerTo);
        this.replaceIndex = -1;
    };

    History.prototype.addLayerUnmerge = function (index) {
        //--
        this.__add(RecordType.LAYER_UNMERGE, index, 1 * 8);
    };

    History.prototype.__revertLayerUnmerge = function (index, change) {
        //--
        this.replaceIndex = index;
        this.layerPanel.mergeLayer(change.data);
        this.replaceIndex = -1;
    };

    History.prototype.addLayerOpacity = function (index, opacity) {
        //--
        this.__add(RecordType.LAYER_OPACITY, {index:index, opacity:opacity}, 2 * 8);
    };

    History.prototype.__revertLayerOpacity = function (index, change) {
        //--
        this.replaceIndex = index;
        this.layerPanel.setLayerOpacity(change.data.index, change.data.opacity);
        this.replaceIndex = -1;
    };

    History.prototype.addLayerBlendMode = function (index, blendMode) {
        //--
        this.__add(RecordType.LAYER_BLENDMODE, {index:index, blendMode:blendMode}, 2 * 8);
    };

    History.prototype.__revertLayerBlendMode = function (index, change) {
        //--
        this.replaceIndex = index;
        this.layerPanel.setLayerBlendMode(change.data.index, change.data.blendMode);
        this.replaceIndex = -1;
    };

    History.prototype.addLayerVisible = function (index, visible) {
        //--
        this.__add(RecordType.LAYER_VISIBLE, index, 8);
    };

    History.prototype.__revertLayerVisible = function (index, change) {
        //--
        this.replaceIndex = index;
        this.layerPanel.toggleLayerVisible(change.data);
        this.replaceIndex = -1;
    };

    History.prototype.addLayerMove = function (fromIndex, toIndex) {
        //--
        this.__add(RecordType.LAYER_MOVE, {fromIndex:fromIndex, toIndex:toIndex}, 2 * 8);
    };

    History.prototype.__revertLayerMove = function (index, change) {
        //--
        this.replaceIndex = index;
        this.layerPanel.moveLayer(change.data.toIndex, change.data.fromIndex, true);
        this.replaceIndex = -1;
    };

    History.prototype.addLayerDraw = function (dirtyRects, numRects) {
        //--
        var canvasWidth     = this.canvasWidth;
        var canvasHeight    = this.canvasHeight;
        var colorBuffer     = this.activeLayer.colorBuffer;
        var colorBufferPrev = this.colorBufferPrev;

        //--
        var prevData = null;
        var storageSize = 0;

        //--
        for (var r = 0; r < numRects; ++r) {
            var rect = dirtyRects[r];
            if (rect == 0) continue;

            //--
            var x0 = Math.min((rect & 0xff) << 5, canvasWidth);
            var y0 = Math.min(((rect >> 8) & 0xff) << 5, canvasHeight);
            var x1 = Math.min(((rect >> 16) & 0xff) << 5, canvasWidth);
            var y1 = Math.min((rect >>> 24) << 5, canvasHeight);

            //--
            var width  = x1 - x0;
            var height = y1 - y0;
            var colorBufferNew = new Uint32Array(width * height);

            //--
            for (var y = 0; y < height; ++y) {
                //--
                var row_i = y * width;
                var row_j = x0 + (y + y0) * canvasWidth;
                //--
                for (var x = 0; x < width; ++x) {
                    //--
                    var i = x + row_i;
                    var j = x + row_j;
                    //--
                    colorBufferNew[i]  = colorBufferPrev[j];
                    colorBufferPrev[j] = colorBuffer[j];
                }
            }

            //--
            var data = {
                colorBuffer: colorBufferNew,
                x0: x0,
                y0: y0,
                x1: x1,
                y1: y1,
                next: null
            };
            data.next = prevData;
            prevData = data;

            //--
            storageSize += 6 * 8 + colorBufferNew.length * 4;
        }

        //--
        if (prevData) {
            this.__add(RecordType.LAYER_DRAW, prevData, storageSize);
        }
    };

    History.prototype.__revertLayerDraw = function (index, change) {
        //--
        var canvasWidth     = this.canvasWidth;
        var canvasHeight    = this.canvasHeight;
        var colorBuffer     = this.activeLayer.colorBuffer;
        var colorBufferPrev = this.colorBufferPrev;

        //--
        var currData = change.data;
        while (currData) {
            //--
            var x0     = currData.x0;
            var y0     = currData.y0;
            var width  = currData.x1 - x0;
            var height = currData.y1 - y0;
            var colorBufferNew = currData.colorBuffer;
            //--
            for (var y = 0; y < height; ++y) {
                //--
                var row_i = y * width;
                var row_j = x0 + (y + y0) * canvasWidth;
                //--
                for (var x = 0; x < width; ++x) {
                    //--
                    var i = x + row_i;
                    var j = x + row_j;
                    //--
                    var color          = colorBufferNew[i];
                    colorBufferNew[i]  = colorBufferPrev[j];
                    colorBufferPrev[j] = color;
                    colorBuffer[j]     = color;
                }
            }
            //--
            currData = currData.next;
        }

        //--
        this.activeLayer.previewUpdate = true;
        if (this.layerPanel.visible) {
            this.layerPanel.updatePreviews();
        }

        //--
        app.device.present(0, 0, canvasWidth, canvasHeight);
    };

    History.prototype.prev = function () {
        //--
        if (this.index > 0) {
            if (this.index == this.changes.length) {
                app.historyNext.enable(true);
            }
            this.__move(--this.index);
            if (this.index == 0) {
                app.historyPrev.enable(false);
            }
        }
    };

    History.prototype.next = function () {
        //--
        if (this.index < this.changes.length) {
            if (this.index == 0) {
                app.historyPrev.enable(true);
            }
            this.__move(this.index++);
            if (this.index == this.changes.length) {
                app.historyNext.enable(false);
            }
        }
    };

    History.prototype.__add = function (type, data, size) {
        //console.log('history:type='+type+', size='+size);
        //--
        var replaceIndex = this.replaceIndex;
        if (replaceIndex == -1) {
            //--
            if (this.index != this.changes.length) {
                //--
                var index       = this.index;
                var changes     = this.changes;
                var storageSize = this.storageSize;

                //--
                for (var i = index, n = changes.length; i < n; ++i) {
                    var change = changes[i];
                    storageSize -= change.size;
                }

                //--
                this.storageSize = storageSize;
                changes.splice(index, changes.length - index);
            }

            //--
            var change = { type:type, data:data, size:size };
            this.index = this.changes.push(change);

            //--
            this.storageSize += 3 * 8 + size;
            if (this.storageSize >= MAX_BUFFER_SIZE) {
                this.__trim();
            }

            //--
            app.historyPrev.enable(true);
       } else {
            //--
            this.storageSize += 3 * 8 + size - this.changes[replaceIndex].size;
            this.changes[replaceIndex] = { type:type, data:data, size:size };
       }
    };

    History.prototype.__trim = function () {
        //--
        var changes = this.changes;
        var storageSize = this.storageSize;
        while (storageSize >= MAX_BUFFER_SIZE) {
            var change = changes.shift();
            storageSize -= change.size;
        }
        console.log('*** history storage trimmed from ' + (this.storageSize/100000) + ' MB to ' + (storageSize/1000000) + ' MB.');
        this.storageSize = storageSize;
    };

    History.prototype.__move = function (index) {
        //--
        var change = this.changes[index];
        switch (change.type) {
        case RecordType.LAYER_NEW:
            this.__revertLayerNew(index, change);
            break;
        case RecordType.LAYER_DELETE:
            this.__revertLayerDelete(index, change);
            break;
        case RecordType.LAYER_DRAW:
            this.__revertLayerDraw(index, change);
            break;
        case RecordType.LAYER_VISIBLE:
            this.__revertLayerVisible(index, change);
            break;
        case RecordType.LAYER_OPACITY:
            this.__revertLayerOpacity(index, change);
            break;
        case RecordType.LAYER_BLENDMODE:
            this.__revertLayerBlendMode(index, change);
            break;
        case RecordType.LAYER_MERGE:
            this.__revertLayerMerge(index, change);
            break;
        case RecordType.LAYER_UNMERGE:
            this.__revertLayerUnmerge(index, change);
            break;
        case RecordType.LAYER_MOVE:
           this.__revertLayerMove(index, change);
            break;
        }
    };

    paletta.History = History;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';

    //--
    var HistoryPrev = function () {
        //--
    };

    HistoryPrev.prototype.init = function () {
        //--
        this.enable(false);
    };

    HistoryPrev.prototype.open = function () {
        //--
        app.history.prev();
        return false;
    };

    HistoryPrev.prototype.enable = function (enable) {
        //--
        app.toolbar.disable(this.widget, !enable);
    };

    paletta.HistoryPrev = HistoryPrev;
}());

///////////////////////////////////////////////////////////////////////////////

(function () {
    'use strict';

    //--
    var HistoryNext = function () {
        //--
    };

    HistoryNext.prototype.init = function () {
        //--
        this.enable(false);
    };

    HistoryNext.prototype.open = function () {
        //--
        app.history.next();
        return false;
    };

    HistoryNext.prototype.enable = function (enable) {
        //--
        app.toolbar.disable(this.widget, !enable);
    };

    paletta.HistoryNext = HistoryNext;
}());
