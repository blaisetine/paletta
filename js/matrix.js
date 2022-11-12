/* Copyright 2014, Blaise Tine. */

var utils = utils || {};

(function () {
    'use strict';

    //--
    var matrix = function (a, b, c, d, tx, ty) {
        //--
        this.a  = a;
        this.b  = b;
        this.c  = c;
        this.d  = d;
        this.tx = tx;
        this.ty = ty;
    };

    matrix.prototype.multiply = function (m) {
        //--
        var a1 = this.a, b1 = this.b, c1 = this.c, d1 = this.d, tx1 = this.tx, ty1 = this.ty;
        var a2 = m.a, b2 = m.b, c2 = m.c, d2 = m.d, tx2 = m.tx, ty2 = m.ty;
        var a  = a1 * a2 + b1 * c2;
        var b  = a1 * b2 + b1 * d2;
        var c  = c1 * a2 + d1 * c2;
        var d  = c1 * b2 + d1 * d2;
        var tx = tx1 * a2 + ty1 * c2 + tx2;
        var ty = tx1 * b2 + ty1 * d2 + ty2;
        return new matrix(a, b, c, d, tx, ty);
    };

    matrix.prototype.inverse = function () {
        //--
        var a1 = this.a, b1 = this.b, c1 = this.c, d1 = this.d, tx1 = this.tx, ty1 = this.ty;
        var det = a1 * d1 - b1 * c1;
        if (!det) {
            return null;
        }
        var inv_det = 1.0 / det;
        var a  = d1 * inv_det;
        var b  =-b1 * inv_det;
        var c  =-c1 * inv_det;
        var d  = a1 * inv_det;
        var tx = (c1 * ty1 - d1 * tx1) * inv_det;
        var ty =-(a1 * ty1 - b1 * tx1) * inv_det;
        return new matrix(a, b, c, d, tx, ty);
    };

    matrix.prototype.transformPoint = function (x, y) {
        //--
        var px = x * this.a + y * this.c + this.tx;
        var py = x * this.b + y * this.d + this.ty;
        return {x:px, y:py};
    };

    matrix.prototype.toStr = function () {
        //--
        return '(' + this.a.toFixed(6) + ',' +
                     this.b.toFixed(6) + ',' +
                     this.c.toFixed(6) + ',' +
                     this.d.toFixed(6) + ',' +
                     this.tx.toFixed(6) + ',' +
                     this.ty.toFixed(6) + ')';
    };

    matrix.fromStr = function (str) {
        //--
        var r = str.match(/\(([^\)]+)\)/i)[1].split(',');
        return new matrix(
            parseFloat(r[0]),
            parseFloat(r[1]),
            parseFloat(r[2]),
            parseFloat(r[3]),
            parseFloat(r[4]),
            parseFloat(r[5])
            );
    };

    matrix.translation = function (tx, ty) {
        //--
        return new matrix(1, 0, 0, 1, tx, ty);
    };

    matrix.scaling = function (sx, sy) {
        //--
        return new matrix(sx, 0, 0, sy, 0, 0);
    };

    matrix.rotation = function (rad) {
        //--
        var s = Math.sin(rad);
        var c = Math.cos(rad);
        return new matrix(c, s, -s, c, 0, 0);
    };

    matrix.fromElement = function (element) {
        //--
        var x = element;
        var transform = new matrix(1, 0, 0, 1, 0, 0);
        while (x !== null && x !== x.ownerDocument.documentElement) {
            var computedStyle = window.getComputedStyle(x, null);
            var c = matrix.fromStr((computedStyle.webkitTransform || 'none').replace(/^none$/, 'matrix(1,0,0,1,0,0)'));
            transform = transform.multiply(c);
            x = x.parentNode;
        }

        {
            var w = element.offsetWidth;
            var h = element.offsetHeight;
            var left = +Infinity;
            var top  = +Infinity;

            for (var i = 0; i < 4; ++i) {
                var p = transform.transformPoint(
                        (i == 0 || i == 1) ? 0 : w,
                        (i == 0 || i == 3) ? 0 : h
                    );
                if (p.x < left) {
                    left = p.x;
                }
                if (p.y < top) {
                    top = p.y;
                }
            }

            var rect = element.getBoundingClientRect();
            var t = matrix.translation(window.pageXOffset + rect.left - left, window.pageYOffset + rect.top - top);
            transform = transform.multiply(t);
        }

        return transform;
     };

    utils.matrix = matrix;
}());
