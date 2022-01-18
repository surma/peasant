use cfg_if::cfg_if;
use rgb::AsPixels;
use std::panic;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;

mod utils;

cfg_if! {
    // When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
    // allocator.
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[wasm_bindgen]
#[no_mangle]
pub fn resize_u16(
    input_image: Vec<u16>,
    input_width: usize,
    input_height: usize,
    factor: f64,
    resize_type: usize,
) -> wasm_bindgen::JsValue {
    if cfg!(debug_assertions) {
        panic::set_hook(Box::new(console_error_panic_hook::hook));
    }

    let resize_algo = match resize_type {
        0 => resize::Type::Triangle,
        1 => resize::Type::Catrom,
        2 => resize::Type::Mitchell,
        3 => resize::Type::Lanczos3,
        _ => panic!("Nope"),
    };

    let output_width = ((input_width as f64) * factor).floor() as usize;
    let output_height = ((input_height as f64) * factor).floor() as usize;
    let mut resizer = resize::new(
        input_width,
        input_height,
        output_width,
        output_height,
        resize::Pixel::RGB16,
        resize_algo,
    )
    .unwrap();
    let output_size = output_width * output_height * 3;
    let mut output_image: Vec<u16> = Vec::with_capacity(output_size);
    output_image.resize(output_size, 0);
    let input_pixels: &[rgb::RGB<u16>] = input_image.as_slice().as_pixels();
    let output_pixels: &mut [rgb::RGB<u16>] = output_image.as_mut_slice().as_pixels_mut();
    resizer.resize(input_pixels, output_pixels).unwrap();

    let result = js_sys::Array::new();
    result.push(&js_sys::Uint16Array::from(output_image.as_slice()));
    // Cast to u32 because u64s are passed as BigInt.
    result.push(&JsValue::from(output_width as u32));
    result.push(&JsValue::from(output_height as u32));
    JsValue::from(result)
}
