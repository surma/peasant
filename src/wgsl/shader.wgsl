struct InputImage {
	pixel: array<vec4<f32>>;
};

struct OutputImage {
	pixel: array<u32>;
};

struct Uniforms {
	width: u32;
	height: u32;
	unused1: u32;
	unused2: u32;
	offset: vec4<f32>;
};

[[group(0), binding(0)]] var<storage, read> input: InputImage;
[[group(0), binding(1)]] var<storage, write> output: OutputImage;
[[group(0), binding(2)]] var<uniform> uniforms: Uniforms;

fn max_index() -> u32 {
	return uniforms.width * uniforms.height * 4u;
}

fn shade(color: vec4<f32>) -> vec4<f32> {
	var xyY = XYZ_to_xyY(color.xyz);
	xyY.x = xyY.x + uniforms.offset.x;
	xyY.y = xyY.y + uniforms.offset.y;
	xyY.z = xyY.z * pow(10., uniforms.offset.z);
	return vec4(xyY_to_XYZ(xyY), 1.0);
}

[[stage(compute), workgroup_size(256)]]
fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
	let index = global_id.x;
	if(index >= max_index()) {
		return;
	}
	var color = input.pixel[index];
	color = shade(color);
	color = XYZ_to_sRGB(color);
	// Manual conversion from vec4<[0. to 1.]> to vec4<[0 to 255]>
	color = clamp(color, vec4(0.), vec4(1.)) * 255.;
	output.pixel[index] = (u32(color.r) << 0u) | (u32(color.g) << 8u) | (u32(color.b) << 16u) | (u32(color.a) << 24u);
}