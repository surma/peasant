use super::Processor;
use crate::rgb::RGB;

pub struct InvertProcessor {}

impl InvertProcessor {
    pub fn new() -> InvertProcessor {
        InvertProcessor {}
    }
}

impl Processor for InvertProcessor {
    fn num_slots(&self) -> (usize, usize) {
        (1, 1)
    }

    fn process(&self, input: Vec<RGB>) -> Vec<RGB> {
        assert!(input.len() == self.num_slots().0);
        let input = &input[0];
        vec![input.with_new_data(input.iter().map(|(r, g, b)| (1.0 - r, 1.0 - g, 1.0 - b)))]
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
