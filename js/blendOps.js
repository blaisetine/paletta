/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var BlendMode = {
        NORMAL:     0,
        MULTIPLY:   1,
        SCREEN:     2,
        OVERLAY:    3,
        DARKEN:     4,
        LIGHTEN:    5,
        COLORDODGE: 6,
        COLORBURN:  7,
        HARDLIGHT:  8,
        SOFTLIGHT:  9,
        DIFFERENCE: 10,
        EXCLUDE:    11,
        MAXVALUE:   12
    };

    var BlendOps = function () {
        //--
        this.blendFuncs = [];
        this.mergeFuncs = [];
    }

    BlendOps.prototype.init = function () {
        //--
        // reference: http://dev.w3.org/fxtf/compositing-1/#blending
        //  C = (1 - dA) * sA * sC + (1 - sA) * dA * dC + sA * dA * B(sC,dC);
        //    = (1 - dA) * S + (1 - sA) * D + sA * dA * B(sC,dC);
        //  A = dA + sA * (1 - dA);
        //  F = C * A;
        //  where:
        //      sC: source color
        //      sA: source alpha
        //      dC: destination color
        //      dA: destination alpha
        //       S: premultiplied source (sC * sA)
        //       D: premultiplied destination (dC * dA)
        //       F: premultiplied output (C * A)
        //  B(i,j): blend function
        //
        //  with opacity = O
        //      C = (1 - dA) * O * S + (1 - sA * O) * D + sA * O * dA * B(sC,dC);
        //      A = dA + sA * O * (1 - dA);
        //      F = C * A;
        //
        //  if blending: dA == 1;
        //      C = (1 - sA * O) * D + sA * O * B(sC,dC);
        //      A = 1;
        //      F = C;
        //
        var blendOps = [
            {   // NORMAL: B = sC;
                // blend: C = O * S + (1 - sA * O) * D;
                //        A = 1;
                // merge: C = O * S + (1 - sA * O) * D;
                //        A = dA + sA * O * (1 - dA);
                blend_init: "",
                blend:"\
                    var mul_sA_O     = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var outColorR = (opacity * srcColorR + inv_mul_sA_O * dstColorR + 0x8000) >> 16;\n\
                    var outColorG = (opacity * srcColorG + inv_mul_sA_O * dstColorG + 0x8000) >> 16;\n\
                    var outColorB = (opacity * srcColorB + inv_mul_sA_O * dstColorB + 0x8000) >> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "",
                merge:"\
                    var mul_sA_O     = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var outColorR = ((opacity * srcColorR + inv_mul_sA_O * dstColorR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((opacity * srcColorG + inv_mul_sA_O * dstColorG) * 257 + 257) >>> 16;\n\
                    var outColorB = ((opacity * srcColorB + inv_mul_sA_O * dstColorB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_sA_O * (255 - dstColorA) + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // MULTIPLY: B = sC * dC;
                // blend: C = D + D * (S - sA) * O;
                //        A = 1;
                // merge: C = S * O * (1 - dA) + D * (1 + (S - sA) * O);
                //        A = dA + sA * O * (1 - dA);
                blend_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                blend:"\
                    var outColorR = dstColorR + ((dstColorR * (srcColorR - srcColorA) * O_div_255 + 0x8000) >>> 16);\n\
                    var outColorG = dstColorG + ((dstColorG * (srcColorG - srcColorA) * O_div_255 + 0x8000) >>> 16);\n\
                    var outColorB = dstColorB + ((dstColorB * (srcColorB - srcColorA) * O_div_255 + 0x8000) >>> 16);\n\
                    var outColorA = 255;\n",
                merge_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                merge:"\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var outColorR = ((srcColorR * mul_inv_dA_O + dstColorR * (0x10000 + (srcColorR - srcColorA) * O_div_255)) * 257 + 257) >>> 16;\n\
                    var outColorG = ((srcColorG * mul_inv_dA_O + dstColorG * (0x10000 + (srcColorG - srcColorA) * O_div_255)) * 257 + 257) >>> 16;\n\
                    var outColorB = ((srcColorB * mul_inv_dA_O + dstColorB * (0x10000 + (srcColorB - srcColorA) * O_div_255)) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((srcColorA * mul_inv_dA_O + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // SCREEN: B = sC + dC - sC * dC;
                // blend: C = D + S * O * (1 - D);
                //        A = 1;
                // merge: C = D + S * O * (1 - D);
                //        A = dA + sA * O * (1 - dA);
                blend_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                blend:"\
                    var outColorR = dstColorR + ((srcColorR * (255 - dstColorR) * O_div_255 + 0x8000) >>> 16);\n\
                    var outColorG = dstColorG + ((srcColorG * (255 - dstColorG) * O_div_255 + 0x8000) >>> 16);\n\
                    var outColorB = dstColorB + ((srcColorB * (255 - dstColorB) * O_div_255 + 0x8000) >>> 16);\n\
                    var outColorA = 255;\n",
                merge_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                merge:"\
                    var outColorR = (((dstColorR << 16) + (srcColorR * (255 - dstColorR) * O_div_255)) * 257 + 257) >>> 16;\n\
                    var outColorG = (((dstColorG << 16) + (srcColorG * (255 - dstColorG) * O_div_255)) * 257 + 257) >>> 16;\n\
                    var outColorB = (((dstColorB << 16) + (srcColorB * (255 - dstColorB) * O_div_255)) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((srcColorA * (255 - dstColorA) * O_div_255 + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // OVERLAY: B = (dC < 0.5) ? (2 * sC * dC) : (1 - 2 * (1 - sC) * (1 - dC));
                // blend: C = (1 - sA * O) * D + sA * O * B;
                //        A = 1;
                // merge: C = (1 - dA) * O * S + (1 - sA * O) * D + sA * O * dA * B;
                //        A = dA + sA * O * (1 - dA);
                blend_init: "",
                blend: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (((_dstColorR < 128) ? (2 * _srcColorR * _dstColorR) : (65025 - 2 * (255 - _srcColorR) * (255 - _dstColorR))) * 257 + 257) >>> 16;\n\
                    var blendG = (((_dstColorG < 128) ? (2 * _srcColorG * _dstColorG) : (65025 - 2 * (255 - _srcColorG) * (255 - _dstColorG))) * 257 + 257) >>> 16;\n\
                    var blendB = (((_dstColorB < 128) ? (2 * _srcColorB * _dstColorB) : (65025 - 2 * (255 - _srcColorB) * (255 - _dstColorB))) * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + mul_sA_O * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + mul_sA_O * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + mul_sA_O * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "",
                merge: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (((_dstColorR < 128) ? (2 * _srcColorR * _dstColorR) : (65025 - 2 * (255 - _srcColorR) * (255 - _dstColorR))) * 257 + 257) >>> 16;\n\
                    var blendG = (((_dstColorG < 128) ? (2 * _srcColorG * _dstColorG) : (65025 - 2 * (255 - _srcColorG) * (255 - _dstColorG))) * 257 + 257) >>> 16;\n\
                    var blendB = (((_dstColorB < 128) ? (2 * _srcColorB * _dstColorB) : (65025 - 2 * (255 - _srcColorB) * (255 - _dstColorB))) * 257 + 257) >>> 16;\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var mul_sA_O_dA = (mul_sA_O * dstColorA * 257 + 257) >>> 16;\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + mul_sA_O_dA * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + mul_sA_O_dA * blendG) * 257 + 257) >>> 16;\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + mul_sA_O_dA * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // DARKEN: B = min(sC, dC);
                // blend: C = (1 - sA * O) * D + O * min(S * 255, D * sA);
                //        A = 1;
                // merge: C = O * (1 - dA) * S + (1 - sA * O) * D + O * min(S * dA, D * sA);
                //        A = dA + sA * O * (1 - dA);
                blend_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                blend: "\
                    var blendR = Math.min(srcColorR * 255, dstColorR * srcColorA);\n\
                    var blendG = Math.min(srcColorG * 255, dstColorG * srcColorA);\n\
                    var blendB = Math.min(srcColorB * 255, dstColorB * srcColorA);\n\
                    var inv_mul_sA_O = 0x10000 - ((srcColorA * opacity * 257 + 257) >>> 16);\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + O_div_255 * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + O_div_255 * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + O_div_255 * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                merge: "\
                    var blendR = Math.min(srcColorR * dstColorA, dstColorR * srcColorA);\n\
                    var blendG = Math.min(srcColorG * dstColorA, dstColorG * srcColorA);\n\
                    var blendB = Math.min(srcColorB * dstColorA, dstColorB * srcColorA);\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - ((srcColorA * opacity * 257 + 257) >>> 16);\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + O_div_255 * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + O_div_255 * blendG) * 257 + 257) >>> 16\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + O_div_255 * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // LIGHTEN: B = max(sC, dC);
                // blend: C = (1 - sA * O) * D + O * max(S * 255, D * sA);
                //        A = 1;
                // merge: C = O * (1 - dA) * S + (1 - sA * O) * D + O * max(S * dA, D * sA)
                //        A = dA + sA * O * (1 - dA);
                blend_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                blend: "\
                    var blendR = Math.max(srcColorR * 255, dstColorR * srcColorA);\n\
                    var blendG = Math.max(srcColorG * 255, dstColorG * srcColorA);\n\
                    var blendB = Math.max(srcColorB * 255, dstColorB * srcColorA);\n\
                    var inv_mul_sA_O = 0x10000 - ((srcColorA * opacity * 257 + 257) >>> 16);\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + O_div_255 * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + O_div_255 * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + O_div_255 * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                merge: "\
                    var blendR = Math.max(srcColorR * dstColorA, dstColorR * srcColorA);\n\
                    var blendG = Math.max(srcColorG * dstColorA, dstColorG * srcColorA);\n\
                    var blendB = Math.max(srcColorB * dstColorA, dstColorB * srcColorA);\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - ((srcColorA * opacity * 257 + 257) >>> 16);\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + O_div_255 * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + O_div_255 * blendG) * 257 + 257) >>> 16\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + O_div_255 * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // COLORDODGE: B = (sC == 1) ? 1 : min(1, dC / (1 - sC));
                // blend: C = (1 - sA * O) * D + sA * O * B;
                //        A = 1;
                // merge: C = (1 - dA) * O * S + (1 - sA * O) * D + sA * O * dA * B;
                //        A = dA + sA * O * (1 - dA);
                blend_init: "",
                blend: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (_srcColorR == 255) ? 255 : Math.min(255, Math.round((_dstColorR * 255) / (255 - _srcColorR)));\n\
                    var blendG = (_srcColorG == 255) ? 255 : Math.min(255, Math.round((_dstColorG * 255) / (255 - _srcColorG)));\n\
                    var blendB = (_srcColorB == 255) ? 255 : Math.min(255, Math.round((_dstColorB * 255) / (255 - _srcColorB)));\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + mul_sA_O * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + mul_sA_O * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + mul_sA_O * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "",
                merge: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (_srcColorR == 255) ? 255 : Math.min(255, Math.round((_dstColorR * 255) / (255 - _srcColorR)));\n\
                    var blendG = (_srcColorG == 255) ? 255 : Math.min(255, Math.round((_dstColorG * 255) / (255 - _srcColorG)));\n\
                    var blendB = (_srcColorB == 255) ? 255 : Math.min(255, Math.round((_dstColorB * 255) / (255 - _srcColorB)));\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var mul_sA_O_dA = (mul_sA_O * dstColorA * 257 + 257) >>> 16;\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + mul_sA_O_dA * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + mul_sA_O_dA * blendG) * 257 + 257) >>> 16;\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + mul_sA_O_dA * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // COLORBURN: B = (sC == 0) ? 0 : 1 - min(1, (1 - dC) / sC);
                // blend: C = (1 - sA * O) * D + sA * O * B;
                //        A = 1;
                // merge: C = (1 - dA) * O * S + (1 - sA * O) * D + sA * O * dA * B;
                //        A = dA + sA * O * (1 - dA);
                blend_init: "",
                blend: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (_srcColorR == 0) ? 0 : 255 - Math.min(255, Math.round(((255 - _dstColorR) * 255) / _srcColorR));\n\
                    var blendG = (_srcColorG == 0) ? 0 : 255 - Math.min(255, Math.round(((255 - _dstColorG) * 255) / _srcColorG));\n\
                    var blendB = (_srcColorB == 0) ? 0 : 255 - Math.min(255, Math.round(((255 - _dstColorB) * 255) / _srcColorB));\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + mul_sA_O * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + mul_sA_O * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + mul_sA_O * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "",
                merge: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (_srcColorR == 0) ? 0 : 255 - Math.min(255, Math.round(((255 - _dstColorR) * 255) / _srcColorR));\n\
                    var blendG = (_srcColorG == 0) ? 0 : 255 - Math.min(255, Math.round(((255 - _dstColorG) * 255) / _srcColorG));\n\
                    var blendB = (_srcColorB == 0) ? 0 : 255 - Math.min(255, Math.round(((255 - _dstColorB) * 255) / _srcColorB));\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var mul_sA_O_dA = (mul_sA_O * dstColorA * 257 + 257) >>> 16;\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + mul_sA_O_dA * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + mul_sA_O_dA * blendG) * 257 + 257) >>> 16;\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + mul_sA_O_dA * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // HARDLIGHT: B = (sC < 0.5) ? (2 * sC * dC) : (1 - 2 * (1 - sC) * (1 - dC));
                // blend: C = (1 - sA * O) * D + sA * O * B;
                //        A = 1;
                // merge: C = (1 - dA) * O * S + (1 - sA * O) * D + sA * O * dA * B;
                //        A = dA + sA * O * (1 - dA);
                blend_init: "",
                blend: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (((_srcColorR < 128) ? (2 * _srcColorR * _dstColorR) : (65025 - 2 * (255 - _srcColorR) * (255 - _dstColorR))) * 257 + 257) >>> 16;\n\
                    var blendG = (((_srcColorG < 128) ? (2 * _srcColorG * _dstColorG) : (65025 - 2 * (255 - _srcColorG) * (255 - _dstColorG))) * 257 + 257) >>> 16;\n\
                    var blendB = (((_srcColorB < 128) ? (2 * _srcColorB * _dstColorB) : (65025 - 2 * (255 - _srcColorB) * (255 - _dstColorB))) * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + mul_sA_O * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + mul_sA_O * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + mul_sA_O * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "",
                merge: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (((_srcColorR < 128) ? (2 * _srcColorR * _dstColorR) : (65025 - 2 * (255 - _srcColorR) * (255 - _dstColorR))) * 257 + 257) >>> 16;\n\
                    var blendG = (((_srcColorG < 128) ? (2 * _srcColorG * _dstColorG) : (65025 - 2 * (255 - _srcColorG) * (255 - _dstColorG))) * 257 + 257) >>> 16;\n\
                    var blendB = (((_srcColorB < 128) ? (2 * _srcColorB * _dstColorB) : (65025 - 2 * (255 - _srcColorB) * (255 - _dstColorB))) * 257 + 257) >>> 16;\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var mul_sA_O_dA = (mul_sA_O * dstColorA * 257 + 257) >>> 16;\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + mul_sA_O_dA * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + mul_sA_O_dA * blendG) * 257 + 257) >>> 16;\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + mul_sA_O_dA * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // SOFTLIGHT: B = (sC < 0.5) ? (dC - (1 - 2 * sC) * dC * (1 - dC)) : (dC + (2 * sC - 1) * (( (dC < 0.25) ? (((16 * dC - 12) * dC + 4) * dC) : sqrt(dC)) - dC));
                // blend: C = (1 - sA * O) * D + sA * O * B;
                //        A = 1;
                // merge: C = (1 - dA) * O * S + (1 - sA * O) * D + sA * O * dA * B;
                //        A = dA + sA * O * (1 - dA);
                blend_init: "",
                blend: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (((_srcColorR < 128) ? (_dstColorR - (((255 - 2 * _srcColorR) * _dstColorR * (255 - _dstColorR) * 257 + 257) >>> 16)) : (_dstColorR + (2 * _srcColorR - 255) * (((_dstColorR < 64) ? ((((((16 * _dstColorR - 12 * 255) * _dstColorR * 257 + 257) >>> 16) + 4 * 255) * _dstColorR * 257 + 257) >>> 16) : Math.round(Math.sqrt(_dstColorR))) - _dstColorR))) * 257 + 257) >>> 16;\n\
                    var blendG = (((_srcColorG < 128) ? (_dstColorG - (((255 - 2 * _srcColorG) * _dstColorG * (255 - _dstColorG) * 257 + 257) >>> 16)) : (_dstColorG + (2 * _srcColorG - 255) * (((_dstColorG < 64) ? ((((((16 * _dstColorG - 12 * 255) * _dstColorG * 257 + 257) >>> 16) + 4 * 255) * _dstColorG * 257 + 257) >>> 16) : Math.round(Math.sqrt(_dstColorG))) - _dstColorG))) * 257 + 257) >>> 16;\n\
                    var blendB = (((_srcColorB < 128) ? (_dstColorB - (((255 - 2 * _srcColorB) * _dstColorB * (255 - _dstColorB) * 257 + 257) >>> 16)) : (_dstColorB + (2 * _srcColorB - 255) * (((_dstColorB < 64) ? ((((((16 * _dstColorB - 12 * 255) * _dstColorB * 257 + 257) >>> 16) + 4 * 255) * _dstColorB * 257 + 257) >>> 16) : Math.round(Math.sqrt(_dstColorB))) - _dstColorB))) * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + mul_sA_O * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + mul_sA_O * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + mul_sA_O * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "",
                merge: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = (((_srcColorR < 128) ? (_dstColorR - (((255 - 2 * _srcColorR) * _dstColorR * (255 - _dstColorR) * 257 + 257) >>> 16)) : (_dstColorR + (2 * _srcColorR - 255) * (((_dstColorR < 64) ? ((((((16 * _dstColorR - 12 * 255) * _dstColorR * 257 + 257) >>> 16) + 4 * 255) * _dstColorR * 257 + 257) >>> 16) : Math.round(Math.sqrt(_dstColorR))) - _dstColorR))) * 257 + 257) >>> 16;\n\
                    var blendG = (((_srcColorG < 128) ? (_dstColorG - (((255 - 2 * _srcColorG) * _dstColorG * (255 - _dstColorG) * 257 + 257) >>> 16)) : (_dstColorG + (2 * _srcColorG - 255) * (((_dstColorG < 64) ? ((((((16 * _dstColorG - 12 * 255) * _dstColorG * 257 + 257) >>> 16) + 4 * 255) * _dstColorG * 257 + 257) >>> 16) : Math.round(Math.sqrt(_dstColorG))) - _dstColorG))) * 257 + 257) >>> 16;\n\
                    var blendB = (((_srcColorB < 128) ? (_dstColorB - (((255 - 2 * _srcColorB) * _dstColorB * (255 - _dstColorB) * 257 + 257) >>> 16)) : (_dstColorB + (2 * _srcColorB - 255) * (((_dstColorB < 64) ? ((((((16 * _dstColorB - 12 * 255) * _dstColorB * 257 + 257) >>> 16) + 4 * 255) * _dstColorB * 257 + 257) >>> 16) : Math.round(Math.sqrt(_dstColorB))) - _dstColorB))) * 257 + 257) >>> 16;\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var mul_sA_O_dA = (mul_sA_O * dstColorA * 257 + 257) >>> 16;\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + mul_sA_O_dA * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + mul_sA_O_dA * blendG) * 257 + 257) >>> 16;\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + mul_sA_O_dA * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // DIFFERENCE: B = abs(dC - sC);
                // blend: C = (1 - sA * O) * D + sA * O * B;
                //        A = 1;
                // merge: C = (1 - dA) * O * S + (1 - sA * O) * D + sA * O * dA * B;
                //        A = dA + sA * O * (1 - dA);
                blend_init: "",
                blend: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = Math.abs(_dstColorR - _srcColorR);\n\
                    var blendG = Math.abs(_dstColorG - _srcColorG);\n\
                    var blendB = Math.abs(_dstColorB - _srcColorB);\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + mul_sA_O * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + mul_sA_O * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + mul_sA_O * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "",
                merge: "\
                    var div_255_sA = 255 / srcColorA;\n\
                    var div_255_dA = 255 / dstColorA;\n\
                    var _srcColorR = Math.round(srcColorR * div_255_sA);\n\
                    var _srcColorG = Math.round(srcColorG * div_255_sA);\n\
                    var _srcColorB = Math.round(srcColorB * div_255_sA);\n\
                    var _dstColorR = Math.round(dstColorR * div_255_dA);\n\
                    var _dstColorG = Math.round(dstColorG * div_255_dA);\n\
                    var _dstColorB = Math.round(dstColorB * div_255_dA);\n\
                    var blendR = Math.abs(_dstColorR - _srcColorR);\n\
                    var blendG = Math.abs(_dstColorG - _srcColorG);\n\
                    var blendB = Math.abs(_dstColorB - _srcColorB);\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var mul_sA_O = (srcColorA * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - mul_sA_O;\n\
                    var mul_sA_O_dA = (mul_sA_O * dstColorA * 257 + 257) >>> 16;\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + mul_sA_O_dA * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + mul_sA_O_dA * blendG) * 257 + 257) >>> 16;\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + mul_sA_O_dA * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
            {   // EXCLUDE: B = sC + dC - 2 * sC * dC;
                // blend: C = (1 - sA * O) * D + O * (S + D - 2 * S * D);
                //        A = 1;
                // merge: C = (1 - dA) * O * S + (1 - sA * O) * D + O * (S + D - 2 * S * D);
                //        A = dA + sA * O * (1 - dA);
                blend_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                blend: "\
                    var blendR = (srcColorR * 255 + dstColorR * 255 - 2 * srcColorR * dstColorR);\n\
                    var blendG = (srcColorG * 255 + dstColorG * 255 - 2 * srcColorG * dstColorG);\n\
                    var blendB = (srcColorB * 255 + dstColorB * 255 - 2 * srcColorB * dstColorB);\n\
                    var inv_mul_sA_O = 0x10000 - ((srcColorA * opacity * 257 + 257) >>> 16);\n\
                    var outColorR = (inv_mul_sA_O * dstColorR + O_div_255 * blendR + 0x8000) >>> 16;\n\
                    var outColorG = (inv_mul_sA_O * dstColorG + O_div_255 * blendG + 0x8000) >>> 16;\n\
                    var outColorB = (inv_mul_sA_O * dstColorB + O_div_255 * blendB + 0x8000) >>> 16;\n\
                    var outColorA = 255;\n",
                merge_init: "\
                    var O_div_255 = (opacity * 257 + 257) >>> 16;\n",
                merge: "\
                    var blendR = (srcColorR * 255 + dstColorR * 255 - 2 * srcColorR * dstColorR);\n\
                    var blendG = (srcColorG * 255 + dstColorG * 255 - 2 * srcColorG * dstColorG);\n\
                    var blendB = (srcColorB * 255 + dstColorB * 255 - 2 * srcColorB * dstColorB);\n\
                    var mul_inv_dA_O = ((255 - dstColorA) * opacity * 257 + 257) >>> 16;\n\
                    var inv_mul_sA_O = 0x10000 - ((srcColorA * opacity * 257 + 257) >>> 16);\n\
                    var outColorR = ((mul_inv_dA_O * srcColorR + inv_mul_sA_O * dstColorR + O_div_255 * blendR) * 257 + 257) >>> 16;\n\
                    var outColorG = ((mul_inv_dA_O * srcColorG + inv_mul_sA_O * dstColorG + O_div_255 * blendG) * 257 + 257) >>> 16\n\
                    var outColorB = ((mul_inv_dA_O * srcColorB + inv_mul_sA_O * dstColorB + O_div_255 * blendB) * 257 + 257) >>> 16;\n\
                    var outColorA = dstColorA + ((mul_inv_dA_O * srcColorA + 0x8000) >>> 16);\n\
                    outColorR = (outColorR * outColorA + 0x8000) >> 16;\n\
                    outColorG = (outColorG * outColorA + 0x8000) >> 16;\n\
                    outColorB = (outColorB * outColorA + 0x8000) >> 16;\n",
            },
        ];

        var function_begin = "";

        var function_loop_start = "\
            for (var y = y0; y < y1; ++y) {\n\
                for (var x = x0; x < x1; ++x) {\n\
                    var srcIndex = x + y * width;\n\
                    var srcColor  = colorBuffer[srcIndex];\n\
                    var srcColorA = srcColor >>> 24;\n\
                    var srcColorB = (srcColor >> 16) & 0xff;\n\
                    var srcColorG = (srcColor >> 8) & 0xff;\n\
                    var srcColorR = srcColor & 0xff;\n";

        var function_read_dstColor_LittleEndian = "\
                    var dstColor  = backBuffer[srcIndex];\n\
                    var dstColorA = dstColor >>> 24;\n\
                    var dstColorB = (dstColor >> 16) & 0xff;\n\
                    var dstColorG = (dstColor >> 8) & 0xff;\n\
                    var dstColorR = dstColor & 0xff;\n";

        var function_read_dstColor_BigEndian = "\
                    var dstColor  = backBuffer[srcIndex];\n\
                    var dstColorA = dstColor & 0xff;\n\
                    var dstColorB = (dstColor >> 8) & 0xff;\n\
                    var dstColorG = (dstColor >> 16) & 0xff;\n\
                    var dstColorR = dstColor >>> 24;\n";

        var function_write_output_LittleEndian = "\
                    var outColor = (outColorA << 24) | (outColorB << 16) | (outColorG << 8) | outColorR;\n\
                    outputBuffer[srcIndex] = outColor;\n";

        var function_write_output_BigEndian = "\
                    var outColor = (outColorR << 24) | (outColorG << 16) | (outColorB << 8) | outColorA;\n\
                    outputBuffer[srcIndex] = outColor;\n";

        var function_end = "}}";

        //--
        var isLittleEndian = utils.isLittleEndian();
        var function_read_dstColor = isLittleEndian ? function_read_dstColor_LittleEndian : function_read_dstColor_BigEndian;
        var function_write_output = isLittleEndian ? function_write_output_LittleEndian : function_write_output_BigEndian;

        //--
        var blendFuncs = this.blendFuncs;
        var mergeFuncs = this.mergeFuncs;
        for (var i = 0, n = BlendMode.MAXVALUE; i < n; ++i) {
            var blend_body = function_begin + blendOps[i].blend_init + function_loop_start + function_read_dstColor + blendOps[i].blend + function_write_output + function_end;
            var merge_body = function_begin + blendOps[i].merge_init + function_loop_start + function_read_dstColor + blendOps[i].merge + function_write_output + function_end;
            blendFuncs[i] = new Function("outputBuffer", "backBuffer", "colorBuffer", "opacity", "width", "x0", "y0", "x1", "y1", blend_body);
            mergeFuncs[i] = new Function("outputBuffer", "backBuffer", "colorBuffer", "opacity", "width", "x0", "y0", "x1", "y1", merge_body);
        }
    }

    BlendOps.prototype.getBlendFunction = function (blendMode) {
        //--
        return this.blendFuncs[blendMode];
    }

    BlendOps.prototype.getMergeFunction = function (blendMode) {
        //--
        return this.mergeFuncs[blendMode];
    }

    BlendOps.prototype.getBlendModeAbr = function (blendMode) {
        //--
        switch (blendMode) {
        case BlendMode.NORMAL:
            return "N";
        case BlendMode.MULTIPLY:
            return "M";
        case BlendMode.SCREEN:
            return "Sc";
        case BlendMode.OVERLAY:
            return "O";
        case BlendMode.DARKEN:
            return "D";
        case BlendMode.LIGHTEN:
            return "L";
        case BlendMode.COLORDODGE:
            return "Cd";
        case BlendMode.COLORBURN:
            return "Cb";
        case BlendMode.HARDLIGHT:
            return "Hl";
        case BlendMode.SOFTLIGHT:
            return "Sl";
        case BlendMode.DIFFERENCE:
            return "Df";
        case BlendMode.EXCLUDE:
            return "Ex";
        }
        return "";
    }

    BlendOps.prototype.getBlendModeName = function (blendMode) {
        //--
        switch (blendMode) {
        case BlendMode.NORMAL:
            return "normal";
        case BlendMode.MULTIPLY:
            return "multiply";
        case BlendMode.SCREEN:
            return "screen";
        case BlendMode.OVERLAY:
            return "overlay";
        case BlendMode.DARKEN:
            return "darken";
        case BlendMode.LIGHTEN:
            return "lighten";
        case BlendMode.COLORDODGE:
            return "colorDodge";
        case BlendMode.COLORBURN:
            return "colorBurn";
        case BlendMode.HARDLIGHT:
            return "hardLight";
        case BlendMode.SOFTLIGHT:
            return "softLight";
        case BlendMode.DIFFERENCE:
            return "difference";
        case BlendMode.EXCLUDE:
            return "exclude";
        }
        return "";
    }

    paletta.BlendMode = BlendMode;
    paletta.BlendOps = BlendOps;
}());
