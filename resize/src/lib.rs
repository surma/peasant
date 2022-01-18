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

struct Rgb(rgb::RGB<f32>);

impl Rgb {
    fn new() -> Rgb {
        Rgb(rgb::RGB::new(0.0, 0.0, 0.0))
    }
}

impl resize::PixelFormat for Rgb {
    type InputPixel = rgb::RGB<u16>;
    type OutputPixel = rgb::RGB<f32>;
    type Accumulator = rgb::RGB<f32>;

    fn new() -> Self::Accumulator {
        rgb::RGB::new(0.0, 0.0, 0.0)
    }

    fn add(&self, acc: &mut Self::Accumulator, inp: Self::InputPixel, coeff: f32) {
        acc.r += coeff * (inp.r as f32) / 65535.0;
        acc.g += coeff * (inp.g as f32) / 65535.0;
        acc.b += coeff * (inp.b as f32) / 65535.0;
    }

    fn add_acc(acc: &mut Self::Accumulator, inp: Self::Accumulator, coeff: f32) {
        acc.r += coeff * inp.r;
        acc.g += coeff * inp.g;
        acc.b += coeff * inp.b;
    }

    fn into_pixel(&self, acc: Self::Accumulator) -> Self::OutputPixel {
        acc
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
        // resize::Pixel::RGB16,
        Rgb::new(),
        resize_algo,
    )
    .unwrap();
    let output_size = output_width * output_height * 3;
    let mut output_image: Vec<f32> = Vec::with_capacity(output_size);
    output_image.resize(output_size, 0.0);
    let input_pixels: &[rgb::RGB<u16>] = input_image.as_slice().as_pixels();
    let output_pixels: &mut [rgb::RGB<f32>] = output_image.as_mut_slice().as_pixels_mut();
    resizer.resize(input_pixels, output_pixels).unwrap();

    let result = js_sys::Array::new();
    result.push(&js_sys::Float32Array::from(output_image.as_slice()));
    // Cast to u32 because u64s are passed as BigInt.
    result.push(&JsValue::from(output_width as u32));
    result.push(&JsValue::from(output_height as u32));
    JsValue::from(result)
}
