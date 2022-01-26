struct InputImage {
	pixel: array<vec4<f32>>;
};

struct OutputImage {
	pixel: array<u32>;
};

struct Meta {
	width: u32;
	height: u32;
};

[[group(0), binding(0)]] var<storage, read> input: InputImage;
[[group(0), binding(1)]] var<storage, write> output: OutputImage;
[[group(0), binding(2)]] var<storage, read> meta: Meta;

[[stage(compute), workgroup_size(16, 16)]]
fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
	if(global_id.x >= meta.width) {
		return;
	}
	if(global_id.y >= meta.height) {
		return;
	}
	let index = global_id.y * meta.width + global_id.x;
	var color = input.pixel[index];
	color = XYZ_to_sRGB(color);
	// Manual conversion from vec4<[0. to 1.]> to vec4<[0 to 255]>
	color = clamp(color, vec4(0.), vec4(1.)) * 255.;
	output.pixel[index] = (u32(color.r) << 0u) | (u32(color.g) << 8u) | (u32(color.b) << 16u) | (u32(color.a) << 24u);
}