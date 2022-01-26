// Most of this code is based on the CSS WG’s lovely reference implementation
// which can be found here: 
// https://github.com/w3c/csswg-drafts/blob/main/css-color-4

// Assuming XYZ with D65
let XYZ_to_linear_sRGB_matrix = mat3x3<f32>(
	 3.2409699419045226, -0.96924363628087960,  0.05563007969699366,
	-1.5373831775700940,  1.87596750150772020, -0.20397695888897652,
	-0.4986107602930034,  0.04155505740717559,  1.05697151424287860
);

// Assuming XYZ with D65
let linear_sRGB_to_XYZ_matrix = mat3x3<f32>(
	0.41239079926595934, 0.21263900587151030, 0.019330818715591815,
	0.35758433938387807, 0.71516867876775610, 0.119194779794625960,
	0.18048078840183426, 0.07219231536073371, 0.950532152249660500,
);

fn XYZ_to_linear_sRGB(v: vec3<f32>) -> vec3<f32> {
	return XYZ_to_linear_sRGB_matrix * v;
}

fn linear_sRGB_to_XYZ(v: vec3<f32>) -> vec3<f32> {
	return linear_sRGB_to_XYZ_matrix * v;
}

fn xyY_to_XYZ(v: vec3<f32>) -> vec3<f32> {
	return vec3(
		v.x * v.z / v.y,
		v.z,
		(1. - v.x - v.y)*v.z/v.y
	);
}

let D50 = vec3(0.9642, 1.0000, 0.8251);
let D65 = vec3(0.9504, 1.0000, 1.0888);

fn XYZ_to_xyY(v: vec3<f32>) -> vec3<f32> {
	// For black, use the chromaticity of D65
	if(v.x == 0. && v.y == 0. && v.z == 0.) {
		return vec3(.3127, .3290, 0.);
	}
	let sum = v.x + v.y + v.z;
	return vec3(
		v.x / sum,
		v.y / sum,
		v.y
	);
}

fn sRGB_gamma(val: f32) -> f32 {
	// convert an array of linear-light sRGB values in the range 0.0-1.0
	// to gamma corrected form
	// https://en.wikipedia.org/wiki/SRGB
	// Extended transfer function:
	// For negative values, linear portion extends on reflection
	// of axis, then uses reflected pow below that
		let abs = abs(val);

		if (abs > 0.0031308) {
			return sign(val) * (1.055 * pow(abs, 1./2.4) - 0.055);
		}

		return 12.92 * val;
}

fn sRGB_degamma(val: f32) -> f32 {
	// convert an array of sRGB values
	// where in-gamut values are in the range [0 - 1]
	// to linear light (un-companded) form.
	// https://en.wikipedia.org/wiki/SRGB
	// Extended transfer function:
	// for negative values,  linear portion is extended on reflection of axis,
	// then reflected power function is used.
	let abs = abs(val);

	if (abs < 0.04045) {
		return val / 12.92;
	}

	return sign(val) * (pow((abs + 0.055) / 1.055, 2.4));
}

fn XYZ_to_Lab(value: vec3<f32>) -> vec3<f32> {
	// Assuming XYZ is relative to D50, convert to CIE Lab
	// from CIE standard, which now defines these as a rational fraction
	let e = 216./24389.;  // 6^3/29^3
	let k = 24389./27.;   // 29^3/3^3

	// compute xyz, which is XYZ scaled relative to reference white
	let xyz = value / D50;

	// now compute f
	let f = select(pow(value, vec3(1./3.)), (k * value + 16.)/116., value > vec3(e));

	return vec3(
		(116. * f[1]) - 16., 	 // L
		500. * (f[0] - f[1]), // a
		200. * (f[1] - f[2])  // b
	);
	// L in range [0,100]. For use in CSS, add a percent
}

fn Lab_to_XYZ(Lab: vec3<f32>) -> vec3<f32> {
	// Convert Lab to D50-adapted XYZ
	// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
	let k = 24389./27.;   // 29^3/3^3
	let e = 216./24389.;  // 6^3/29^3

	// compute f, starting with the luminance-related term
	let f1 =(Lab[0] + 16.)/116.;
	let f = vec3(
		Lab[1]/500. + f1,
		f1,
		f1 - Lab[2]/200.
	);	

	// compute xyz
	let xyz = vec3(
		select(pow(f[0], 3.),                (116. * f[0] - 16.)/k, pow(f[0], 3.) > e),
		select(pow((Lab[0] + 16.)/116., 3.), Lab[0]/k,              Lab[0] > k * e),
		select(pow(f[2], 3.),                (116. * f[2] - 16.)/k, pow(f[2], 3.) > e)
	);

	// Compute XYZ by scaling xyz by reference white
	return xyz * D50;
}

fn XYZ_to_sRGB(color: vec4<f32>) -> vec4<f32> {
	let linear_srgb = XYZ_to_linear_sRGB(color.rgb);
	return vec4(
		sRGB_gamma(linear_srgb.r),
		sRGB_gamma(linear_srgb.g),
		sRGB_gamma(linear_srgb.b),
		color.a
	);
}

fn sRGB_to_XYZ(color: vec4<f32>) -> vec4<f32> {
	let linear_srgb = vec3(
		sRGB_degamma(color.r),
		sRGB_degamma(color.g),
		sRGB_degamma(color.b),
	);
	return vec4(linear_sRGB_to_XYZ(linear_srgb), color.a);
}

/*
	This encodes the possible colorspace conversions.
	[0; 256] is allocated for conversions from XYZ to other color spaces.
	<Any conversion index> + 256 ought to be the inverse conversion, 
	i.e. from the other color space to XYZ.
*/

fn convert_to_colorspace(color: vec4<f32>, target_colorspace: u32) -> vec4<f32> {
	switch(target_colorspace) {
		case 0u: { // XYZ_TO_SRGB 
			return XYZ_to_sRGB(color);
		}
		case 256u: { // SRGB_TO_XYZ = XYZ_TO_SRGB + 256 
			return sRGB_to_XYZ(color);
		}
		default: {
			return color;
		} 
	}
}
