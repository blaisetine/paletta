/* Copyright 2014, Blaise Tine. */

var utils = utils || {};

(function () {
    'use strict';
    
    function ceilE(value) {
        var ivalue = Math.ceil(value);
        return (ivalue % 2 == 0) ? ivalue : (ivalue + 1);
    }

    function imod (a, b) {
        var ret = a % b;
        if (ret < 0) {
            ret += b;
        }
        return ret;
    }

    function fmod (a, b) {
        return a - b * floor(a / b);
    }

    function strpad(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length-size);
    }

    //--
    var hexDigits = new Array("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f");

    function rgba2bgra(rgba) {
        return (rgba & 0xff00ff00) | ((rgba >> 16) & 0x000000ff) | ((rgba << 16) & 0x00ff0000);
    }

    function hex(x) {
        return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
    }

    function csscolor2hex(color) {
        //--
        var rgb = color.match(/^rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/);
        if (rgb != null) {
            return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
        }
        var rgba = color.match(/^rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/);
        if (rgba != null) {
            return "#" + hex(rgba[1]) + hex(rgba[2]) + hex(rgba[3]);
        }
        var hsl = color.match(/^hsl\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/);
        if (hsl != null) {
            return rgb2hex(hsl2rgb(hsl));
        }
        var hsla = color.match(/^hsla\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)$/);
        if (hsla != null) {
            return rgb2hex(hsl2rgb(hsla));
        }
        return color;
    }

    //--
    function calcOffset(element) {
        //--
        var viewport = document.documentElement;
        var rect = element.getBoundingClientRect();
        var x = rect.left + viewport.scrollLeft;
        var y = rect.top + viewport.scrollTop;
        return { x:x, y:y };
    }

    function distance(x0, y0, x1, y1) {
        //--
        var dx = x1 - x0;
        var dy = y1 - y0;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function angle(x0, y0, x1, y1) {
        //--
        var dx = x1 - x0;
        var dy = y1 - y0;
        return Math.atan2(dy, dx);
    }

    function rgb2hex(rgb) {
        return "#" + (0x1000000 | (rgb & 0x00ffffff)).toString(16).substring(1);
    }

    function hex2rgb(hex) {
        return parseInt(((hex.indexOf("#") > -1) ? hex.substring(1) : hex), 16);
    }

    function rgb2hsl(rgb) {
       // reference: http://www.rapidtables.com/convert/color/rgb-to-hsl.htm
       var __scale_255_to_1 = 1.0 / 255;
        var r = ((rgb >> 16) & 0xff) * __scale_255_to_1;
        var g = ((rgb >> 8) & 0xff) * __scale_255_to_1;
        var b = (rgb & 0xff) * __scale_255_to_1;
        //--
        var min = Math.min(r, g, b);
        var max = Math.max(r, g, b);
        var d = max - min;
        //--
        var h, s, l;
        l = (max + min) / 2;
        if (d == 0) {
            h = 0; s = 0;
        } else {
            s = d / (1 - Math.abs(2 * l - 1));
            if (max == r) {
                h = (g - b) / d;
            } else
            if (max == g) {
                h = (b - r) / d + 2;
            } else {
                h = (r - g) / d + 4;
            }
            h *= 60;
            if (h < 0) {
                h += 360;
            }
        }
        //--
        s = Math.round(s * 100);
        l = Math.round(l * 100);
        return {h:h, s:s, l:l};
    }

    function hsl2rgb(hsl) {
        // reference: http://www.rapidtables.com/convert/color/hsl-to-rgb.htm
        // h [0-360)
        // s [0-100]
        // l [0-100]
        var h = hsl.h / 60;
        var s = hsl.s / 100;
        var l = hsl.l / 100;
        //--
        var c  = (1 - Math.abs(2*l - 1)) * s;
        var m  = l - 0.5 * c;
        var ih = Math.floor(h);
        var f  = h - ih;
        var x0 = c * f;
        var x1 = c * (1 - f);
        //--
        var r, g, b;
        switch (ih) {
        default:
        case 0: r = c;  g = x0; b = 0;  break;
        case 1: r = x1; g = v;  b = 0;  break;
        case 2: r = 0;  g = v;  b = x0; break;
        case 3: r = 0;  g = x1; b = c;  break;
        case 4: r = x0; g = 0;  b = c;  break;
        case 5: r = c;  g = 0;  b = x1; break;
        }
        //--
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        return (r << 16) | (g << 8) | b;
    }

    function rgb2hsv(rgb) {
        // reference: http://www.rapidtables.com/convert/color/rgb-to-hsv.htm
        var __scale_255_to_1 = 1.0 / 255;
        var r = ((rgb >> 16) & 0xff) * __scale_255_to_1;
        var g = ((rgb >> 8) & 0xff) * __scale_255_to_1;
        var b = (rgb & 0xff) * __scale_255_to_1;
        //--
        var min = Math.min(r, g, b);
        var max = Math.max(r, g, b);
        var d = max - min;
        //--
        var h, s, v;
        v = max;
        if (d == 0) {
            h = 0; s = 0;
        } else {
            s = d / max;
            if (max == r) {
                h = (g - b) / d;
            } else
            if (max == g) {
                h = (b - r) / d + 2;
            } else {
                h = (r - g) / d + 4;
            }
            h *= 60;
            if (h < 0) {
                h += 360;
            }
        }
        //--
        s = Math.round(s * 100);
        v = Math.round(v * 100);
        return {h:h, s:s, v:v};
    }

    function hsv2rgb(hsv) {
        // reference: http://www.rapidtables.com/convert/color/hsv-to-rgb.htm
        // h [0-360)
        // s [0-100]
        // v [0-100]
        var h = hsv.h / 60;
        var s = hsv.s / 100;
        var v = hsv.v / 100;
        //--
        var c  = v * s;
        var m  = v - c;
        var ih = Math.floor(h);
        var f  = h - ih;
        var x0 = c * f;
        var x1 = c * (1 - f);
        //--
        var r, g, b;
        switch (ih) {
        default:
        case 0: r = c;  g = x0; b = 0;  break;
        case 1: r = x1; g = v;  b = 0;  break;
        case 2: r = 0;  g = v;  b = x0; break;
        case 3: r = 0;  g = x1; b = c;  break;
        case 4: r = x0; g = 0;  b = c;  break;
        case 5: r = c;  g = 0;  b = x1; break;
        }
        //--
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        return (r << 16) | (g << 8) | b;
    }

    function rgb2cmyk(rgb) {
        //reference: http://www.rapidtables.com/convert/color/rgb-to-cmyk.htm
        var __scale_255_to_1 = 1.0 / 255;
        var r = ((rgb >> 16) & 0xff) * __scale_255_to_1;
        var g = ((rgb >> 8) & 0xff) * __scale_255_to_1;
        var b = (rgb & 0xff) * __scale_255_to_1;
        //--
        var c, m, y, k;
        k = 1.0 - Math.max(r, g, b);
        if (k == 1.0) {
            c = 0; m = 0; y = 0;
        } else {
            var w = 1.0 / (1.0 - k);
            c = (1.0 - r - k) * w;
            m = (1.0 - g - k) * w;
            y = (1.0 - b - k) * w;
        }
        c = Math.round(c * 100);
        m = Math.round(m * 100);
        y = Math.round(y * 100);
        k = Math.round(k * 100);
        return {c:c, m:m, y:y, k:k};
    }

    function cmyk2rgb(cmyk) {
        // reference: http://www.rapidtables.com/convert/color/cmyk-to-rgb.htm
        // c [0 - 100]
        // m [0 - 100]
        // y [0 - 100]
        // k [0 - 100]
        var k = cmyk.k / 100;
        if (k == 1.0) {
            r = 0; g = 0; b = 0;
        } else {
            var w = (1.0 - k) / 100;
            r = 1.0 - (cmyk.c * w + k);
            g = 1.0 - (cmyk.m * w + k);
            b = 1.0 - (cmyk.y * w + k);
        }
        r = Math.round(r * 255);
        g = Math.round(g * 255);
        b = Math.round(b * 255);
        return (r << 16) | (g << 8) | b;
    }

    function generateThumbNail(canvas, size, contentType) {
        //--
        var tmp_canvas = document.createElement('canvas');
        var context = tmp_canvas.getContext('2d');
        var scale = Math.min(1.0, size / ((canvas.width > canvas.height) ? canvas.width : canvas.height));
        tmp_canvas.width = canvas.width * scale;
        tmp_canvas.height = canvas.height * scale;
        context.globalCompositeOperation='copy';
        context.drawImage(canvas, 0, 0, tmp_canvas.width, tmp_canvas.height);
        return tmp_canvas.toDataURL(contentType);
    }

    function dataURItoBlob(dataURI) {
        //--
        var byte_string = window.atob(dataURI.split(',')[1]);
        var mime_string = dataURI.split(',')[0].split(':')[1].split(';')[0];
        var len = byte_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; ++i) {
            bytes[i] = byte_string.charCodeAt(i);
        }
        return new Blob([bytes], {type: mime_string});
    }

    function isLittleEndian() {
        //--
        var a8  = new Uint8Array(2);
        var a16 = new Uint16Array(a8.buffer);
        a16[0] = 0x80ff;
        return (a8[0] == 0xff);
    }

    function putImageData(context, dx, dy, src, swidth, sheight, sx, sy, sw, sh) {
        //--
        var tmp_cvs = document.createElement('canvas');
        var tmp_ctx = tmp_cvs.getContext('2d');
        var imgData = tmp_ctx.createImageData(swidth, sheight);
        var buffer  = new Uint32Array(imgData.data.buffer);
        for (var i = 0; i < buffer.length; ++i) {
            buffer[i] = src[i] | 0xFF000000;
        }
        context.putImageData(imgData, dx - sx, dy - sy, sx, sy, sw, sh);
    }

    function clear32(dst, dwidth, dheight, dx, dy, dw, dh, value) {
        //--
        var width  = dx + dw;
        var height = dy + dh;

        //--
        for (var y = dy; y < height; ++y) {
            //--
            for (var x = dx; x < width; ++x) {
                //--
                dst[x + y * dwidth] = value;
            }
        }
    }

    function bitBlt32_nearest(dst, dwidth, dheight, dx, dy, dw, dh, src, swidth, sheight, sx, sy, sw, sh) {
        //--
        var RD_SHIFT = 16;

        //--
        var ax = Math.round((sw << RD_SHIFT) / dw);
        var ay = Math.round((sh << RD_SHIFT) / dh);
        var bx = (sx << RD_SHIFT) - (ax * dx);
        var by = (sy << RD_SHIFT) - (ay * dy);
        bx += (ax >> 1); // +0.5f destination offset
        by += (ay >> 1); // +0.5f destination offset

        //--
        var width  = dx + dw;
        var height = dy + dh;

        //--
        for (var y = dy; y < height; ++y) {
            //--
            var yi  = (ay * y + by) >> RD_SHIFT;
            var row = yi * swidth;
            //--
            for (var x = dx; x < width; ++x) {
                //--
                var xi = (ax * x + bx) >> RD_SHIFT;
                dst[x + y * dwidth] = src[xi + row];
            }
        }
    }

    function bitBlt32_bilinear(dst, dwidth, dheight, dx, dy, dw, dh, src, swidth, sheight, sx, sy, sw, sh) {
        //--
        var RD_SHIFT = 16;
        var RD_ONE   = 1 << RD_SHIFT;
        var RD_FRAC  = RD_ONE - 1;
        var RD_HALF  = RD_ONE >> 1;
        var RD_RND8  = 1 << (RD_SHIFT - 8 - 1);

        //--
        var ax = Math.round((sw << RD_SHIFT) / dw);
        var ay = Math.round((sh << RD_SHIFT) / dh);
        var bx = (sx << RD_SHIFT) - (ax * dx);
        var by = (sy << RD_SHIFT) - (ay * dy);
        bx += (ax >> 1); // +0.5f destination offset
        by += (ay >> 1); // +0.5f destination offset
        bx += -RD_HALF + RD_RND8;  // -0.5f source offset + round_to_N.8
        by += -RD_HALF + RD_RND8;  // -0.5f source offset + round_to_N.8

        //--
        var swidth1  = sx + sw - 1;
        var sheight1 = sy + sh - 1;

        //--
        var width  = dx + dw;
        var height = dy + dh;

        //--
        for (var y = dy; y < height; ++y) {
            //--
            var _y = ay * y + by;
            var yi = _y >> RD_SHIFT;
            var yf = (_y & RD_FRAC) >> (RD_SHIFT - 8);
            var row0 = Math.max(yi, sy) * swidth;
            var row1 = Math.min(yi+1, sheight1) * swidth;

            //--
            for (var x = dx; x < width; ++x) {
                //--
                var _x = ax * x + bx;
                var xi = _x >> RD_SHIFT;
                var xf = (_x & RD_FRAC) >> (RD_SHIFT - 8);
                var x0 = Math.max(xi, sx);
                var x1 = Math.min(xi+1, swidth1);

                //--
                var c00 = src[x0 + row0];
                var c10 = src[x1 + row0];
                var c01 = src[x0 + row1];
                var c11 = src[x1 + row1];

                //--
                var c00_rb = c00 & 0x00ff00ff;
                var c10_rb = c10 & 0x00ff00ff;
                var c00_ag = (c00 >> 8) & 0x00ff00ff;
                var c10_ag = (c10 >> 8) & 0x00ff00ff;
                var ct_rb  = (c00_rb + (((c10_rb - c00_rb) * xf) >> 8)) & 0x00ff00ff;
                var ct_ag  = (c00_ag + (((c10_ag - c00_ag) * xf) >> 8)) & 0x00ff00ff;

                //--
                var c01_rb = c01 & 0x00ff00ff;
                var c11_rb = c11 & 0x00ff00ff;
                var c01_ag = (c01 >> 8) & 0x00ff00ff;
                var c11_ag = (c11 >> 8) & 0x00ff00ff;
                var cb_rb  = (c01_rb + (((c11_rb - c01_rb) * xf) >> 8)) & 0x00ff00ff;
                var cb_ag  = (c01_ag + (((c11_ag - c01_ag) * xf) >> 8)) & 0x00ff00ff;

                //--
                var c_rb = (ct_rb + (((cb_rb - ct_rb) * yf) >> 8)) & 0x00ff00ff;
                var c_ag = (ct_ag + (((cb_ag - ct_ag) * yf) >> 8)) & 0x00ff00ff;
                var rgba = c_rb | (c_ag << 8);

                dst[x + y * dwidth] = rgba;
            }
        }
    }

    function bitBlt32_bicubic(dst, dwidth, dheight, dx, dy, dw, dh, src, swidth, sheight, sx, sy, sw, sh) {
        //--
        var RD_SHIFT = 16;
        var RD_ONE   = 1 << RD_SHIFT;
        var RD_FRAC  = RD_ONE - 1;
        var RD_HALF  = RD_ONE >> 1;

        //--
        function mul(a, b) {
            return (a * b + RD_HALF) >> RD_SHIFT;
        }

        //--
        function getValue(t, a, b, c, d) {
            return b + ((mul(t, c - a + mul(t, 2 * a - 5 * b + 4 * c - d + mul(t, 3 * (b - c) + d - a))) + 1) >> 1);
        }

        //--
        var ax = Math.round((sw << RD_SHIFT) / dw);
        var ay = Math.round((sh << RD_SHIFT) / dh);
        var bx = (sx << RD_SHIFT) - (ax * dx);
        var by = (sy << RD_SHIFT) - (ay * dy);
        bx += (ax >> 1); // +0.5f destination offset
        by += (ay >> 1); // +0.5f destination offset

        //--
        var dst8 = new Uint8ClampedArray(dst.buffer);
        var src8 = new Uint8ClampedArray(src.buffer);

        //--
        var swidth1  = sx + sw - 1;
        var sheight1 = sy + sh - 1;

        //--
        var width  = dx + dw;
        var height = dy + dh;

        //--
        for (var y = dy; y < height; ++y) {
            //--
            var _y = ay * y + by;
            var yi = _y >> RD_SHIFT;
            var yf = _y & RD_FRAC;

            //--
            var row0 = Math.max(yi-1, sy) * swidth ;
            var row1 = yi * swidth;
            var row2 = Math.min(yi+1, sheight1) * swidth;
            var row3 = Math.min(yi+2, sheight1) * swidth;

            //--
            for (var x = dx; x < width; ++x) {
                //--
                var _x = ax * x + bx;
                var xi = _x >> RD_SHIFT;
                var xf = _x & RD_FRAC;

                //--
                var x0 = Math.max(xi-1, sx);
                var x1 = xi;
                var x2 = Math.min(xi+1, swidth1);
                var x3 = Math.min(xi+2, swidth1);

                //--
                var idx = (x + y * dwidth) * 4;
                for (var i = 0; i < 3; ++i) {
                    var c0 = getValue(xf, src8[(x0+row0)*4+i], src8[(x1+row0)*4+i], src8[(x2+row0)*4+i], src8[(x3+row0)*4+i]);
                    var c1 = getValue(xf, src8[(x0+row1)*4+i], src8[(x1+row1)*4+i], src8[(x2+row1)*4+i], src8[(x3+row1)*4+i]);
                    var c2 = getValue(xf, src8[(x0+row2)*4+i], src8[(x1+row2)*4+i], src8[(x2+row2)*4+i], src8[(x3+row2)*4+i]);
                    var c3 = getValue(xf, src8[(x0+row3)*4+i], src8[(x1+row3)*4+i], src8[(x2+row3)*4+i], src8[(x3+row3)*4+i]);
                    dst8[idx+i] = getValue(yf, c0, c1, c2, c3);
                }
                dst8[idx+3] = 0xff;
            }
        }
    }

    function resize32_abuffer(dst, dwidth, dheight, dx, dy, dw, dh, src, swidth, sheight, sx, sy, sw, sh, aBuffer, awidth) {
        //--
        var RD_SHIFT = 16;
        var RD_ONE   = 1 << RD_SHIFT;
        var RD_FRAC  = RD_ONE - 1;
        var RD_HALF  = RD_ONE >> 1;

        //--
        var ax = Math.round((sw << RD_SHIFT) / dw);
        var ay = Math.round((sh << RD_SHIFT) / dh);
        var bx = (sx << RD_SHIFT) - (ax * dx);
        var by = (sy << RD_SHIFT) - (ay * dy);
        bx += (ax >> 1); // +0.5f destination offset
        by += (ay >> 1); // +0.5f destination offset

        //--
        var swidth1  = sx + sw - 1;
        var sheight1 = sy + sh - 1;
        var dwidth1  = dx + dw - 1;
        var dheight1 = dy + dh - 1;

        //--
        var width  = dx + dw;
        var height = dy + dh;

        //--
        var dst8 = new Uint8ClampedArray(dst.buffer);
        var src8 = new Uint8ClampedArray(src.buffer);

        //--
        for (var y = dx; y < height; ++y) {
            //--
            var yi    = (ay * y + by) >> RD_SHIFT;
            var srow0 = Math.max(0, Math.min(yi-1, sheight1)) * swidth;
            var srow1 = Math.max(0, Math.min(yi+0, sheight1)) * swidth;
            var srow2 = Math.max(0, Math.min(yi+1, sheight1)) * swidth;

            //--
            var arow0 = Math.max(0, Math.min(y-1, dheight1)) * awidth;
            var arow1 = Math.max(0, Math.min(y+0, dheight1)) * awidth;
            var arow2 = Math.max(0, Math.min(y+1, dheight1)) * awidth;

            //--
            for (var x = 0; x < width; ++x) {
                //--
                var ax0 = Math.max(0, Math.min(x-1, dwidth1));
                var ax1 = Math.max(0, Math.min(x+0, dwidth1));
                var ax2 = Math.max(0, Math.min(x+1, dwidth1));

                //--
                var a00 = aBuffer[ax0+arow0];
                var a10 = aBuffer[ax1+arow0];
                var a20 = aBuffer[ax2+arow0];
                var a01 = aBuffer[ax0+arow1];
                var a11 = aBuffer[ax1+arow1];
                var a21 = aBuffer[ax2+arow1];
                var a02 = aBuffer[ax0+arow2];
                var a12 = aBuffer[ax1+arow2];
                var a22 = aBuffer[ax2+arow2];

                //--
                var f = (a11 * 0x1010000 + 257) >>> 16;
                var a = a00 + a10 + a20 + a01 + a21 + a02 + a12 + a22;
                var g = a ? Math.round((RD_ONE - f) / a) : 0;

                //--
                var xi = (ax * x + bx) >> RD_SHIFT;
                var sx0 = Math.max(0, Math.min(xi-1, swidth1));
                var sx1 = Math.max(0, Math.min(xi+0, swidth1));
                var sx2 = Math.max(0, Math.min(xi+1, swidth1));

                //--
                var idx = (x + y * dwidth) * 4;
                for (var i = 0; i < 3; ++i) {
                    //--
                    var c00 = src8[(sx0+srow0)*4+i];
                    var c10 = src8[(sx1+srow0)*4+i];
                    var c20 = src8[(sx2+srow0)*4+i];
                    var c01 = src8[(sx0+srow1)*4+i];
                    var c11 = src8[(sx1+srow1)*4+i];
                    var c21 = src8[(sx2+srow1)*4+i];
                    var c02 = src8[(sx0+srow2)*4+i];
                    var c12 = src8[(sx1+srow2)*4+i];
                    var c22 = src8[(sx2+srow2)*4+i];

                    //--
                    var ct = c00 * a00 + c10 * a10 + c20 * a20 +
                             c01 * a01             + c21 * a21 +
                             c02 * a02 + c12 * a12 + c22 * a22;
                    //--
                    dst8[idx+i] = (c11 * f + ct * g + RD_HALF) >> RD_SHIFT;
                }
                dst8[idx+3] = 0xff;
            }
        }
    }

    var jsonp = {
        script: null,
        callback: null,
        call: function (url, callback) {
            //--
            var head = document.getElementsByTagName("head")[0];
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = url + (url.indexOf("?")+1 ? "&" : "?") + "callback=utils.jsonp.callback";
            if (this.script) {
                head.removeChild(this.script);
            }
            this.callback = callback;
            this.script = script;
            head.appendChild(script);
        }
    };

    function saveAs(blob, filename) {
        //--
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, filename);
            return;
        }
        //--
        var url = window.webkitURL ? window.webkitURL.createObjectURL(blob) : window.URL.createObjectURL(blob);
        var link = document.createElement("a");
        if (typeof link.download === 'undefined') {
            window.location = url;
        } else {
            link.download = filename;
            link.href = url;
            link.onclick = function (e) {
                document.body.removeChild(event.target);
            };
            document.body.appendChild(link);
            link.click();
        }
    }
    
    function loadscript(src, id, callback) {
        if (document.getElementById(id)) {
            return; 
        }                    
        var script = document.createElement('script'); 
        script.id = id;
        script.src = src;
        script.onload = function () { callback(); }
        document['body'].appendChild(script);
    }

    utils.ceilE = ceilE;
    utils.imod = imod;
    utils.fmod = fmod;
    utils.strpad = strpad;

    utils.csscolor2hex = csscolor2hex;

    utils.rgba2bgra = rgba2bgra;

    utils.rgb2hex = rgb2hex;
    utils.hex2rgb = hex2rgb;

    utils.hsl2rgb = hsl2rgb;
    utils.rgb2hsl = rgb2hsl;

    utils.hsv2rgb = hsv2rgb;
    utils.rgb2hsv = rgb2hsv;

    utils.cmyk2rgb = cmyk2rgb;
    utils.rgb2cmyk = rgb2cmyk;

    utils.jsonp = jsonp;

    utils.saveAs = saveAs;

    utils.bitBlt32_nearest   = bitBlt32_nearest;
    utils.bitBlt32_bilinear  = bitBlt32_bilinear;
    utils.bitBlt32_bicubic   = bitBlt32_bicubic;
    utils.putImageData       = putImageData;
    utils.clear32            = clear32;
    utils.resize32_abuffer   = resize32_abuffer;

    utils.isLittleEndian     = isLittleEndian;
    utils.distance           = distance;
    utils.angle              = angle;
    utils.generateThumbNail  = generateThumbNail;
    utils.dataURItoBlob      = dataURItoBlob;
    utils.loadscript         = loadscript;
}());
