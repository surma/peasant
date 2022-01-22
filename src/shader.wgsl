struct ImageF32 {
	pixel: array<vec4<f32>>;
};

struct ImageU8 {
	pixel: array<u32>;
};

struct Uniforms {
	offset: vec4<f32>;
};

[[group(0), binding(0)]] var<storage, read> input: ImageF32;
[[group(0), binding(1)]] var<storage, write> output: ImageU8;
[[group(0), binding(2)]] var<uniform> uniforms: Uniforms;

let D50_to_D65 = mat3x3<f32>(
	 0.955473452704218200, -0.028369706963208136,  0.012314001688319899,   
	-0.023098536874261423,  1.009995458005822600, -0.020507696433477912, 
	 0.063259308661021700,  0.021041398966943008,  1.330365936608075300
);

fn XYZ_to_linear_sRGB(v: vec3<f32>) -> vec3<f32> {
	return mat3x3<f32>(
		3.2409699419045226, -0.96924363628087960,  0.05563007969699366,
		-1.5373831775700940,  1.87596750150772020, -0.20397695888897652,
		-0.4986107602930034,  0.04155505740717559,  1.05697151424287860
	) * v;
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

fn srgb_gamma(val: f32) -> f32 {
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

fn srgb(color: vec4<f32>) -> vec4<f32> {
	let linear_srgb = XYZ_to_linear_sRGB(color.rgb);
	return vec4(
		srgb_gamma(linear_srgb.r),
		srgb_gamma(linear_srgb.g),
		srgb_gamma(linear_srgb.b),
		color.a
	);
}

fn shade(color: vec4<f32>) -> vec4<f32> {
	return vec4(xyY_to_XYZ(XYZ_to_xyY(color.xyz) + uniforms.offset.xyz), 1.0);
}

[[stage(compute), workgroup_size(256)]]
fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
	let index = global_id.x;
	if(index >= arrayLength(&input.pixel)) {
		return;
	}
	var color = input.pixel[index];
	color = shade(color);
	color = srgb(color);
	// Manual conversion from vec4<[0. to 1.]> to vec4<[0 to 255]>
	color = clamp(color, vec4(0.), vec4(1.)) * 255.;
	output.pixel[index] = (u32(color.r) << 0u) | (u32(color.g) << 8u) | (u32(color.b) << 16u) | (u32(color.a) << 24u);
}