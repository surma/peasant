use rayon::prelude::*;
use std::{convert::TryInto, env::args, fs::File, io::prelude::*};

use pixlproc::{
    processor::{InvertProcessor, LinearPipeline, Processor, ResizeProcessor},
    RGB,
};

enum KnownProcessor {
    ResizeProcessor_(ResizeProcessor),
    InvertProcessor_(InvertProcessor),
}

impl Processor for KnownProcessor {
    fn num_slots(&self) -> (usize, usize) {
        match self {
            KnownProcessor::ResizeProcessor_(p) => p.num_slots(),
            KnownProcessor::InvertProcessor_(p) => p.num_slots(),
        }
    }
    fn process(&self, input: Vec<RGB>) -> Vec<RGB> {
        match self {
            KnownProcessor::ResizeProcessor_(p) => p.process(input),
            KnownProcessor::InvertProcessor_(p) => p.process(input),
        }
    }
    fn clear_caches(&mut self) {
        match self {
            KnownProcessor::ResizeProcessor_(p) => p.clear_caches(),
            KnownProcessor::InvertProcessor_(p) => p.clear_caches(),
        }
    }
}

fn main() {
    println!(
        "LibRaw v{}.{}.{}",
        libraw::VERSION_MAJOR,
        libraw::VERSION_MINOR,
        libraw::VERSION_PATCH
    );
    let file_path = args().collect::<Vec<String>>().swap_remove(1);

    println!("Reading {}...", file_path);
    let mut file = File::open(file_path).expect("Couldn’t open file");
    let mut contents: Vec<u8> = Vec::new();
    file.read_to_end(&mut contents).expect("Couldn’t read file");

    let mut data = libraw::Data::from_buffer(Box::from(contents)).expect("Could not parse file");
    println!("Dimensions: {}x{}", data.raw_width(), data.raw_height());
    println!("Focal Length: {}mm", data.focal_length());
    println!("Aperture: f/{:0.1}", data.aperture());
    println!("ISO: {}", data.iso_speed());
    if data.shutter() < 1.0 {
        println!("Shutter: 1/{}", 1.0 / data.shutter());
    } else {
        println!("Shutter: {}", data.shutter());
    }
    let raw_image = data.demosaic().expect("Could not demosaic");
    println!(
        "Demosaiced dimensions: {}x{}",
        raw_image.width(),
        raw_image.height()
    );

    let image = RGB::from_u16(
        raw_image.width(),
        raw_image.height(),
        raw_image.data().iter().copied(),
    );
    let mut proc = LinearPipeline::<KnownProcessor>::new();
    proc.push(KnownProcessor::ResizeProcessor_(
        ResizeProcessor::with_width(1024),
    ));
    proc.push(KnownProcessor::InvertProcessor_(InvertProcessor::new()));
    let output = proc.process(vec![image]).pop().unwrap();

    let file = File::create("./out.png").expect("Could not open output file");
    let mut encoder = png::Encoder::new(
        file,
        output.width().try_into().unwrap(),
        output.height().try_into().unwrap(),
    );
    encoder.set_color(png::ColorType::RGB);
    encoder.set_depth(png::BitDepth::Eight);
    let mut writer = encoder.write_header().expect("Could not write header");

    println!("Converting to 8bit...");
    let data8: Vec<u8> = output
        .data()
        .par_iter()
        .map(|v| (v * 255.0) as u8)
        .collect();
    println!("Done.");
    writer
        .write_image_data(&data8)
        .expect("Could not write pixel data"); // Save
}
