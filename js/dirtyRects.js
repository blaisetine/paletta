/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var MAX_DIRTY_RECTS = 200;

    var DirtyRects = function () {
        //--
        this.dirtyRects = null;
    };

    DirtyRects.prototype.add = function (x0, y0, x1, y1) {
        //console.log("dirtyRect:x0="+x0+",y0="+y0+",x1="+x1+",y1="+y1);
        this.__add(x0, y0, x1, y1, this.dirtyRects, 0);
    };

    DirtyRects.prototype.clear = function () {
        //--
        var dirtyRects = this.dirtyRects;
        this.dirtyRects = null;
        return dirtyRects;
    };

    DirtyRects.prototype.__add = function (x0, y0, x1, y1, dirtyRects, start) {
        //--
        var i0 = -1;
        var _dirtyRects = null;
        while (dirtyRects) {
            //--
            for (var buffer = dirtyRects.buffer, i0 = -1, i = start, n = dirtyRects.size; i < n;) {
                //--
                var _rect = buffer[i];
                if (_rect == 0) {
                    i0 = i++;   // skip disabled rects, advance to the next rect
                    continue;
                }

                //--
                var _x0 = _rect & 0xff;
                var _y0 = (_rect >> 8) & 0xff;
                var _x1 = (_rect >> 16) & 0xff;
                var _y1 = _rect >>> 24;

                // skip if no overlap
                if (x0 >= _x1 || y0 >= _y1 || x1 <= _x0 || y1 <= _y0) {
                    //--
                    if (y0 == _y0 && y1 == _y1) {
                        if (x0 == _x1) {
                            // merge the rects horizontally from the left
                            buffer[i] = (_y1 << 24) | (x1 << 16) | (_y0 << 8) | _x0;
                            return;
                        }
                        if (x1 == _x0) {
                            // merge the rects horizontally from the right
                            buffer[i] = (_y1 << 24) | (_x1 << 16) | (_y0 << 8) | x0;
                            return;
                        }
                    }
                    //--
                    if (x0 == _x0 && x1 == _x1) {
                        if (y0 == _y1) {
                            // merge the rects vertically from the top
                            buffer[i] = (y1 << 24) | (_x1 << 16) | (_y0 << 8) | _x0;
                            return;
                        }
                        if (y1 == _y0) {
                            // merge the rects vertically from the bottom
                            buffer[i] = (_y1 << 24) | (_x1 << 16) | (y0 << 8) | _x0;
                            return;
                        }
                    }
                    ++i; // advance to the next rect
                    continue;
                }

                //--
                if (x0 <= _x0) {
                    // new rect starts to the left of existing rect
                    if (y0 <= _y0) {
                        // new rect overlaps at least the top-left corner of existing rect
                        if (x1 >= _x1) {
                            // new rect overlaps entire width of existing rect
                            if (y1 >= _y1) {
                                buffer[i] = 0;  // new rect overlaps the entire existing rect, disable the rect
                                i0 = i++;   // advance to the next rect
                                continue;
                            }
                            // new rect contains the top of existing rect
                            buffer[i] = (_y1 << 24) | (_x1 << 16) | (y1 << 8) | _x0;
                            continue;
                        } else {
                            // new rect overlaps to the left of existing rect
                            if (y1 >= _y1) {
                                // new rect contains left of existing rect
                                buffer[i] = (_y1 << 24) | (_x1 << 16) | (_y0 << 8) | x1;
                                continue;
                            }
                            // new rect overlaps top-left corner of existing rect
                            this.__add(x0, y0, x1, _y0, dirtyRects, i + 1);
                            this.__add(x0, _y0, _x0, y1, dirtyRects, i + 1);
                            return;
                        }
                    } else {
                        // new rect starts within the vertical range of existing rect
                        if (x1 >= _x1) {
                            // new rect horizontally overlaps existing rect
                            if (y1 >= _y1) {
                                // new rect contains bottom of existing rect
                                buffer[i] = (y0 << 24) | (_x1 << 16) | (_y0 << 8) | _x0;
                                continue;
                            }
                            // new rect overlaps to the left and right of existing rect
                            this.__add(x0, y0, _x0, y1, dirtyRects, i + 1);
                            this.__add(_x1, y0, x1, y1, dirtyRects, i + 1);
                            return;
                        } else {
                            // new rect ends within horizontal range of existing rect
                            if (y1 >= _y1) {
                                // new rect overlaps bottom-left corner of existing rect
                                this.__add(x0, y0, _x0, _y1, dirtyRects, i + 1);
                                this.__add(x0, _y1, x1, y1, dirtyRects, i + 1);
                                return;
                            }
                            // existing rect contains right part of new rect
                            x1 = _x0;
                            continue;
                        }
                    }
                } else {
                    // new rect starts within the horizontal range of existing rect
                    if (y0 < _y0) {
                        // new rect starts above existing rect
                        if (x1 > _x1) {
                            // new rect overlaps at least top-right of existing rect
                            if (y1 >= _y1) {
                                // new rect contains the right of existing rect
                                buffer[i] = (_y1 << 24) | (x0 << 16) | (_y0 << 8) | _x0;
                                continue;
                            }
                            // new rect overlaps top-right of existing rect
                            this.__add(x0, y0, x1, _y0, dirtyRects, i + 1);
                            this.__add(_x1, _y0, x1, y1, dirtyRects, i + 1);
                            return;
                        } else {
                            // new rect is horizontally contained within existing rect
                            if (y1 > _y1) {
                                // new rect overlaps to the above and below of existing rect
                                this.__add(x0, y0, x1, _y0, dirtyRects, i + 1);
                                this.__add(x0, _y1, x1, y1, dirtyRects, i + 1);
                                return;
                            }
                            // existing rect contains bottom part of new rect
                            y1 = _y0;
                            continue;
                        }
                    } else {
                        // new rect starts within existing rect
                        if (x1 > _x1) {
                            // new rect overlaps at least to the right of existing rect
                            if (y1 > _y1) {
                                // new rect overlaps bottom-right corner of existing rect
                                this.__add(_x1, y0, x1, _y1, dirtyRects, i + 1);
                                this.__add(x0, _y1, x1, y1, dirtyRects, i + 1);
                                return;
                            }
                            // existing rect contains left part of new rect
                            x0 = _x1;
                            continue;
                        } else {
                            // new rect is horizontally contained within existing rect
                            if (y1 > _y1) {
                                // existing rect contains top part of new rect
                                y0 = _y1;
                                continue;
                            }
                            // new rect is contained within existing rect
                            return;
                        }
                    }
                }
            }
            //--
            _dirtyRects = dirtyRects;
            dirtyRects = dirtyRects.next;
        }

        //--
        var newRect = (y1 << 24) | (x1 << 16) | (y0 << 8) | x0;
        if (i0 == -1) {
            // allocate a new list if empty or full
            if (_dirtyRects == null || _dirtyRects.size == MAX_DIRTY_RECTS) {
                var newDirtyRects = {buffer:new Uint32Array(MAX_DIRTY_RECTS), size:0, next:null};
                if (_dirtyRects) {
                    _dirtyRects.next = newDirtyRects;
                } else {
                    this.dirtyRects = newDirtyRects;
                }
                _dirtyRects = newDirtyRects;
            }
            // store the rectangle
            var size = _dirtyRects.size;
            _dirtyRects.buffer[size] = newRect;
            _dirtyRects.size = size + 1;
        } else {
            // use existing empty slot
            _dirtyRects.buffer[i0] = newRect;
        }
    };

    paletta.DirtyRects = DirtyRects;
}());
