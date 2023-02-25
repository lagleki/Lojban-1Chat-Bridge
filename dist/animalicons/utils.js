"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinimumColorVariance = exports.getHash = void 0;
const util_1 = require("util");
const color_space_1 = __importDefault(require("color-space"));
const delta_e_1 = __importDefault(require("delta-e"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Returns a SHA-1 hash of the given message.
 */
async function getHash(message) {
    const encoder = new util_1.TextEncoder();
    const data = encoder.encode(message);
    const buffer = crypto_1.default.createHash('sha1').update(data).digest();
    // const buffer = await window.crypto.subtle.digest("SHA-1", data);
    const byteArray = new Uint8Array(buffer);
    const hexCodes = [...byteArray].map((value) => {
        const hexCode = value.toString(16);
        const paddedHexCode = hexCode.padStart(2, "0");
        return paddedHexCode;
    });
    return hexCodes.join("");
}
exports.getHash = getHash;
/**
 * Returns an array with RGB values of the given hex color.
 */
function hex2RGB(hex) {
    let v = hex;
    if (v.startsWith("#")) {
        v = v.substring(1);
    }
    if (v.length === 3) {
        return [
            parseInt(v.substring(0, 1).repeat(2), 16),
            parseInt(v.substring(1, 2).repeat(2), 16),
            parseInt(v.substring(2, 3).repeat(2), 16),
        ];
    }
    return [
        parseInt(v.substring(0, 2), 16),
        parseInt(v.substring(2, 4), 16),
        parseInt(v.substring(4, 6), 16),
    ];
}
/**
 * Calculate the CIEDE2000 Delta E value between two colors.
 */
function getDeltaE(hex1, hex2) {
    const lab1 = color_space_1.default.xyz.lab(color_space_1.default.rgb.xyz(hex2RGB(hex1)));
    const lab2 = color_space_1.default.xyz.lab(color_space_1.default.rgb.xyz(hex2RGB(hex2)));
    return delta_e_1.default.getDeltaE00({ L: lab1[0], A: lab1[1], B: lab1[2] }, { L: lab2[0], A: lab2[1], B: lab2[2] });
}
/**
 * Gets the minimum Delta E value for a color compared to a group of colors.
 */
function getMinimumColorVariance(color, compareColors) {
    let v;
    for (let i = 0; i < compareColors.length; i++) {
        const cv = getDeltaE(color, compareColors[i]);
        if (v === undefined || cv < v) {
            v = cv;
        }
    }
    return v || 0;
}
exports.getMinimumColorVariance = getMinimumColorVariance;
