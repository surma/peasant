fn operation_apply_curve(color: vec4<f32>) -> vec4<f32> {
	var color_out = vec4<f32>(color);
	let in_min = operations.data[0];
	let in_max = operations.data[1];
	let in_channel = bitcast<u32>(operations.data[2]);
	let out_min = operations.data[3];
	let out_max = operations.data[4];
	let out_channel = bitcast<u32>(operations.data[5]);

	let normalized_in = (color[in_channel] - in_min) / (in_max - in_min);
	let value = clamp(normalized_in, 0., 1.) * 511.;
	let left = operations.data[u32(floor(value)) + 28u];
	let right = operations.data[u32(floor(value)) + 29u];
	let normalized_out = mix(left, right, fract(value));
	let out = normalized_out * (out_max - out_min) + out_min;
	color_out[out_channel] = out;

	return color_out;
}