fn operation_colorspace_conversion(color: vec4<f32>) -> vec4<f32> {
	let target_colorspace = bitcast<u32>(operations.data[0]);
	return convert_to_colorspace(color, target_colorspace);
}

fn run_operation(color: vec4<f32>) -> vec4<f32> {
	switch(operations.operation) {
		case 0u: { // OPERATION_COLORSPACE_CONVERSION
			return operation_colorspace_conversion(color);
		}
		case 1u: { // OPERATION_APPLY_CURVE
			return operation_apply_curve(color);
		}
		default: {
			return color;
		}
	}
}

[[stage(compute), workgroup_size(16, 16)]]
fn main([[builtin(global_invocation_id)]] global_id : vec3<u32>) {
	if(global_id.x >= operations.width) {
		return;
	}
	if(global_id.y >= operations.height) {
		return;
	}
	let index = global_id.y * operations.width + global_id.x;
	var color = input.pixel[index];
	output.pixel[index] = run_operation(color);
}