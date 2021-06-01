const { TextEncoder } = require('util')
const space = require('color-space');

const deltaE = require("delta-e");
const crypto = require('crypto')
/**
 * Returns a SHA-1 hash of the given message.
 * @param message  The string to be hashed.
 * @returns {string}  The hash.
 */

async function getHash(message) {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	const buffer = crypto.createHash('sha1').update(data).digest()
	// const buffer = await window.crypto.subtle.digest("SHA-1", data);
	const byteArray = new Uint8Array(buffer);

	const hexCodes = [...byteArray].map((value) => {
		const hexCode = value.toString(16);
		const paddedHexCode = hexCode.padStart(2, "0");
		return paddedHexCode;
	});

	return hexCodes.join("");
}

/**
 * Returns an array with RGB values of the given hex color.
 * @param hex  The hex value of the color.
 * @returns {Array}  An array of R, G, B values.
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
 * @param hex1  The hex value of the first color to compare.
 * @param hex2  The hex value of the second color to compare.
 * @returns {number}  The Delta E value.
 */
function getDeltaE(hex1, hex2) {
	const lab1 = space.xyz.lab(space.rgb.xyz(hex2RGB(hex1)));
	const lab2 = space.xyz.lab(space.rgb.xyz(hex2RGB(hex2)));
	return deltaE.getDeltaE00(
		{ L: lab1[0], A: lab1[1], B: lab1[2] },
		{ L: lab2[0], A: lab2[1], B: lab2[2] }
	);
}

/**
 * Gets the minimum Delta E value for a color compared to a group of colors.
 * @param color
 * @param compareColors
 * @returns {*|number}
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

module.exports = {
	getHash,
	hex2RGB,
	getDeltaE,
	getMinimumColorVariance

}