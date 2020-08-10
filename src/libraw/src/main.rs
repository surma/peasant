use std::{env::args, fs::File, io::prelude::*};
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
    println!(
        "[{}, {}, {}]",
        image.data()[0],
        image.data()[1],
        image.data()[2]
    );
}
