import { TextEncoder } from 'util';
import space from 'color-space';

import deltaE from "delta-e";
import crypto from 'crypto';

/**
 * Returns a SHA-1 hash of the given message.
 */
export async function getHash(message: string): Promise<string> {
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
 */
function hex2RGB(hex: any): Array<any> {
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
function getDeltaE(hex1: any, hex2: any): number {
	const lab1 = space.xyz.lab(space.rgb.xyz(hex2RGB(hex1)));
	const lab2 = space.xyz.lab(space.rgb.xyz(hex2RGB(hex2)));
	return deltaE.getDeltaE00(
		{ L: lab1[0], A: lab1[1], B: lab1[2] },
		{ L: lab2[0], A: lab2[1], B: lab2[2] }
	);
}

/**
 * Gets the minimum Delta E value for a color compared to a group of colors.
 */
export function getMinimumColorVariance(color: any, compareColors: string | any[]): any | number {
	let v: number | undefined;
	for (let i = 0; i < compareColors.length; i++) {
		const cv = getDeltaE(color, compareColors[i]);
		if (v === undefined || cv < v) {
			v = cv;
		}
	}
	return v || 0;
}
