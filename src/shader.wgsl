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

let d50_to_d65 = mat3x3<f32>(
	 0.955473452704218200, -0.028369706963208136,  0.012314001688319899,   
	-0.023098536874261423,  1.009995458005822600, -0.020507696433477912, 
	 0.063259308661021700,  0.021041398966943008,  1.330365936608075300
);

let xyz_to_linear_srgb = mat3x3<f32>(
   3.2409699419045226, -0.96924363628087960,  0.05563007969699366,
	-1.5373831775700940,  1.87596750150772020, -0.20397695888897652,
	-0.4986107602930034,  0.04155505740717559,  1.05697151424287860
);

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

fn srgb(color: vec4<f32>) -> vec4<f32> {
	let linear_srgb = xyz_to_linear_srgb * color.rgb;
	return vec4(
		srgb_gamma(linear_srgb.r),
		srgb_gamma(linear_srgb.g),
		srgb_gamma(linear_srgb.b),
		color.a
	);
}

fn shade(color: vec4<f32>) -> vec4<f32> {
	return color + uniforms.offset;
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