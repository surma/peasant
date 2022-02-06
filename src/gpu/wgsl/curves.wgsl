fn operation_apply_curve(color: vec4<f32>) -> vec4<f32> {
	let target_colorspace = bitcast<u32>(operations.data[0]);
	let in_min = operations.data[1];
	let in_max = operations.data[2];
	let in_channel = bitcast<u32>(operations.data[3]);
	let out_min = operations.data[4];
	let out_max = operations.data[5];
	let out_channel = bitcast<u32>(operations.data[6]);
	var new_color = convert_to_colorspace(color, target_colorspace);

	let normalized_in = (new_color[in_channel] - in_min) / (in_max - in_min);
	let value = clamp(normalized_in, 0., 1.) * 511.;
	let left = operations.data[u32(floor(value)) + 28u];
	let right = operations.data[u32(floor(value)) + 29u];
	let normalized_out = mix(left, right, fract(value));
	let out = normalized_out * (out_max - out_min) + out_min;
	new_color[out_channel] = out;

	// Convert back to XYZ
	new_color = convert_to_colorspace(new_color, target_colorspace+256u);
	return new_color;
}