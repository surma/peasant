// Most of this code is based on the CSS WG's lovely reference implementation
// which can be found here: 
// https://github.com/w3c/csswg-drafts/blob/main/css-color-4

// Assuming XYZ with D65
const XYZ_to_linear_sRGB_matrix = [
	[ 3.2409699419045226, -0.96924363628087960,  0.05563007969699366],
	[-1.5373831775700940,  1.87596750150772020, -0.20397695888897652],
	[-0.4986107602930034,  0.04155505740717559,  1.05697151424287860]
];

// Assuming XYZ with D65
const linear_sRGB_to_XYZ_matrix = [
	[0.41239079926595934, 0.21263900587151030, 0.019330818715591815],
	[0.35758433938387807, 0.71516867876775610, 0.119194779794625960],
	[0.18048078840183426, 0.07219231536073371, 0.950532152249660500]
];

type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];

function multiplyMatrix3x3(matrix: number[][], v: Vec3): Vec3 {
	return [
		matrix[0][0] * v[0] + matrix[0][1] * v[1] + matrix[0][2] * v[2],
		matrix[1][0] * v[0] + matrix[1][1] * v[1] + matrix[1][2] * v[2],
		matrix[2][0] * v[0] + matrix[2][1] * v[1] + matrix[2][2] * v[2]
	];
}

export function XYZ_to_linear_sRGB(v: Vec3): Vec3 {
	return multiplyMatrix3x3(XYZ_to_linear_sRGB_matrix, v);
}

export function linear_sRGB_to_XYZ(v: Vec3): Vec3 {
	return multiplyMatrix3x3(linear_sRGB_to_XYZ_matrix, v);
}

export function xyY_to_XYZ(v: Vec3): Vec3 {
	return [
		v[0] * v[2] / v[1],
		v[2],
		(1 - v[0] - v[1]) * v[2] / v[1]
	];
}

const D50: Vec3 = [0.9642, 1.0000, 0.8251];
const D65: Vec3 = [0.9504, 1.0000, 1.0888];

export function XYZ_to_xyY(v: Vec3): Vec3 {
	// For black, use the chromaticity of D65
	if (v[0] === 0 && v[1] === 0 && v[2] === 0) {
		return [0.3127, 0.3290, 0];
	}
	const sum = v[0] + v[1] + v[2];
	return [
		v[0] / sum,
		v[1] / sum,
		v[1]
	];
}

export function sRGB_gamma(val: number): number {
	// convert an array of linear-light sRGB values in the range 0.0-1.0
	// to gamma corrected form
	// https://en.wikipedia.org/wiki/SRGB
	// Extended transfer function:
	// For negative values, linear portion extends on reflection
	// of axis, then uses reflected pow below that
	const abs = Math.abs(val);

	if (abs > 0.0031308) {
		return Math.sign(val) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
	}

	return 12.92 * val;
}

export function sRGB_degamma(val: number): number {
	// convert an array of sRGB values
	// where in-gamut values are in the range [0 - 1]
	// to linear light (un-companded) form.
	// https://en.wikipedia.org/wiki/SRGB
	// Extended transfer function:
	// for negative values,  linear portion is extended on reflection of axis,
	// then reflected power function is used.
	const abs = Math.abs(val);

	if (abs < 0.04045) {
		return val / 12.92;
	}

	return Math.sign(val) * Math.pow((abs + 0.055) / 1.055, 2.4);
}

export function XYZ_to_Lab(value: Vec3): Vec3 {
	// Assuming XYZ is relative to D50, convert to CIE Lab
	// from CIE standard, which now defines these as a rational fraction
	const e = 216 / 24389;  // 6^3/29^3
	const k = 24389 / 27;   // 29^3/3^3

	// compute xyz, which is XYZ scaled relative to reference white
	const xyz: Vec3 = [value[0] / D50[0], value[1] / D50[1], value[2] / D50[2]];

	// now compute f
	const f: Vec3 = [
		xyz[0] > e ? Math.pow(xyz[0], 1 / 3) : (k * xyz[0] + 16) / 116,
		xyz[1] > e ? Math.pow(xyz[1], 1 / 3) : (k * xyz[1] + 16) / 116,
		xyz[2] > e ? Math.pow(xyz[2], 1 / 3) : (k * xyz[2] + 16) / 116
	];

	return [
		(116 * f[1]) - 16,  // L
		500 * (f[0] - f[1]), // a
		200 * (f[1] - f[2])  // b
	];
	// L in range [0,100]. For use in CSS, add a percent
}

export function Lab_to_XYZ(Lab: Vec3): Vec3 {
	// Convert Lab to D50-adapted XYZ
	// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
	const k = 24389 / 27;   // 29^3/3^3
	const e = 216 / 24389;  // 6^3/29^3

	// compute f, starting with the luminance-related term
	const f1 = (Lab[0] + 16) / 116;
	const f: Vec3 = [
		Lab[1] / 500 + f1,
		f1,
		f1 - Lab[2] / 200
	];

	// compute xyz
	const xyz: Vec3 = [
		Math.pow(f[0], 3) > e ? Math.pow(f[0], 3) : (116 * f[0] - 16) / k,
		Lab[0] > k * e ? Math.pow((Lab[0] + 16) / 116, 3) : Lab[0] / k,
		Math.pow(f[2], 3) > e ? Math.pow(f[2], 3) : (116 * f[2] - 16) / k
	];

	// Compute XYZ by scaling xyz by reference white
	return [xyz[0] * D50[0], xyz[1] * D50[1], xyz[2] * D50[2]];
}

export function XYZ_to_sRGB(color: Vec3): Vec3 {
	const linear_srgb = XYZ_to_linear_sRGB(color);
	return [
		sRGB_gamma(linear_srgb[0]),
		sRGB_gamma(linear_srgb[1]),
		sRGB_gamma(linear_srgb[2])
	];
}

export function sRGB_to_XYZ(color: Vec3): Vec3 {
	const linear_srgb: Vec3 = [
		sRGB_degamma(color[0]),
		sRGB_degamma(color[1]),
		sRGB_degamma(color[2])
	];
	return linear_sRGB_to_XYZ(linear_srgb);
}

/*
	This encodes the possible colorspace conversions.
	[0; 256] is allocated for conversions from XYZ to other color spaces.
	<Any conversion index> + 256 ought to be the inverse conversion, 
	i.e. from the other color space to XYZ.
*/

export function convert_to_colorspace(color: Vec4, target_colorspace: number): Vec4 {
	let rgb_color: Vec3 = [color[0], color[1], color[2]];
	
	switch (target_colorspace) {
		case 0: // XYZ_to_sRGB 
			rgb_color = XYZ_to_sRGB(rgb_color);
			break;
		case 1: // XYZ_to_xyY
			rgb_color = XYZ_to_xyY(rgb_color);
			break;
		case 2: // XYZ_to_Lab
			rgb_color = XYZ_to_Lab(rgb_color);
			break;
		case 256: // sRGB_to_XYZ = XYZ_to_sRGB + 256 
			rgb_color = sRGB_to_XYZ(rgb_color);
			break;
		case 257: // xyY_to_XYZ
			rgb_color = xyY_to_XYZ(rgb_color);
			break;
		case 258: // Lab_to_XYZ
			rgb_color = Lab_to_XYZ(rgb_color);
			break;
		default:
			// rgb_color remains unchanged
			break;
	}
	return [rgb_color[0], rgb_color[1], rgb_color[2], color[3]];
}