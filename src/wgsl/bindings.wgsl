struct Image {
	pixel: array<vec4<f32>>;
};

struct Operations {
	width: u32;
	height: u32;
	operation: u32;
	unused: u32;
	data: array<f32, 1024>;
};

[[group(0), binding(0)]] var<storage, read> input: Image;
[[group(0), binding(1)]] var<storage, write> output: Image;
[[group(0), binding(2)]] var<storage, read> operations: Operations;