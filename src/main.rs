use std::{convert::TryInto, env::args, fs::File, io::prelude::*};
mod bindings;
mod wrapper;

fn main() {
    println!(
        "LibRaw v{}.{}.{}",
        wrapper::VERSION_MAJOR,
        wrapper::VERSION_MINOR,
        wrapper::VERSION_PATCH
    );
    let file_path = args().collect::<Vec<String>>().swap_remove(1);

    println!("Reading {}...", file_path);
    let mut file = File::open(file_path).expect("Couldn’t open file");
    let mut contents: Vec<u8> = Vec::new();
    file.read_to_end(&mut contents).expect("Couldn’t read file");

    let mut data = wrapper::Data::from_buffer(Box::from(contents)).expect("Could not parse file");
    println!("Dimensions: {}x{}", data.raw_width(), data.raw_height());
    println!("Focal Length: {}mm", data.focal_length());
    println!("Aperture: f/{:0.1}", data.aperture());
    println!("ISO: {}", data.iso_speed());
    if data.shutter() < 1.0 {
        println!("Shutter: 1/{}", 1.0 / data.shutter());
    } else {
        println!("Shutter: {}", data.shutter());
    }
    let image = data.demosaic().expect("Could not demosaic");
    println!(
        "Demosaiced dimensions: {}x{}",
        image.width(),
        image.height()
    );

    let file = File::create("./out.png").expect("Could not open output file");
    let mut encoder = png::Encoder::new(
        file,
        image.width().try_into().unwrap(),
        image.height().try_into().unwrap(),
    );
    encoder.set_color(png::ColorType::RGB);
    encoder.set_depth(png::BitDepth::Eight);
    let mut writer = encoder.write_header().expect("Could not write header");

    let data: Vec<u8> = image.data().iter().map(|v| (v >> 8) as u8).collect();
    writer
        .write_image_data(&data)
        .expect("Could not write pixel data"); // Save
}
