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

    let v = wrapper::Data::from_buffer(Box::from(contents)).expect("Could not parse file");
    println!("Aperture: {}", v.aperture());
}
