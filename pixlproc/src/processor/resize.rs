use super::Processor;
use crate::rgb::RGB;

use resize;
pub use resize::Type;

pub struct ResizeProcessor {
    pub width: Option<usize>,
    pub height: Option<usize>,
    pub resizer: resize::Type,
}

impl ResizeProcessor {
    pub fn new() -> ResizeProcessor {
        ResizeProcessor {
            width: None,
            height: None,
            resizer: resize::Type::Point,
        }
    }
    pub fn with_width(width: usize) -> Self {
        let mut l = Self::new();
        l.width = Some(width);
        l
    }

    pub fn with_height(height: usize) -> Self {
        let mut l = Self::new();
        l.height = Some(height);
        l
    }
}

impl Processor for ResizeProcessor {
    fn num_slots(&self) -> (usize, usize) {
        (1, 1)
    }

    fn process(&self, input: Vec<RGB>) -> Vec<RGB> {
        assert!(input.len() == self.num_slots().0);
        let input = &input[0];
        let (dst_width, dst_height) = if let (Some(width), Some(height)) = (self.width, self.height)
        {
            (width, height)
        } else if let Some(width) = self.width {
            (width, width * input.height() / input.width())
        } else if let Some(height) = self.height {
            (height * input.width() / input.height(), height)
        } else {
            panic!("Must define either width or height");
        };
        let output_size = dst_width * dst_height * 3;
        let mut output_data: Vec<f64> = Vec::with_capacity(output_size);
        output_data.resize(output_size, 0.);
        resize::new(
            input.width(),
            input.height(),
            dst_width,
            dst_height,
            resize::Pixel::RGBF64,
            match self.resizer {
                resize::Type::Point => resize::Type::Point,
                resize::Type::Triangle => resize::Type::Triangle,
                resize::Type::Catrom => resize::Type::Catrom,
                resize::Type::Mitchell => resize::Type::Mitchell,
                resize::Type::Lanczos3 => resize::Type::Lanczos3,
                _ => panic!(),
            },
        )
        .resize(input.data(), output_data.as_mut_slice());

        vec![RGB::from_f64(dst_width, dst_height, output_data)]
    }
}

#[cfg(test)]
mod test {
    use crate::{
        processor::{InvertProcessor, Processor},
        rgb::RGB,
    };

    #[test]
    fn invert() {
        let img = RGB::from_u8(3, 1, vec![255u8, 0, 0, 0, 255, 0, 0, 0, 255]);
        let inv = InvertProcessor {};
        let r = inv.process(vec![img]);
        assert!(r.len() == 1);
        assert_eq!(
            r[0].data(),
            vec![0f64, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0].as_slice()
        );
    }
}
