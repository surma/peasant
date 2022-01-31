fn operation_apply_curve(color: vec4<f32>) -> vec4<f32> {
	let target_colorspace = bitcast<u32>(operations.data[0]);
	let target_channel = bitcast<u32>(operations.data[1]);
	var new_color = convert_to_colorspace(color, target_colorspace);

	let value = clamp(new_color[target_channel], 0., 1.) * 511.;
	let left = operations.data[u32(floor(value)) + 2u];
	let right = operations.data[u32(floor(value)) + 3u];
	let new_value = mix(left, right, fract(value));
	new_color[target_channel] = new_value;

	// Convert back to XYZ
	new_color = convert_to_colorspace(new_color, target_colorspace+256u);
	return new_color;
}