use std::iter::{IntoIterator, Iterator};

#[derive(Debug, PartialEq)]
pub struct RGB {
    width: usize,
    height: usize,
    data: Vec<f64>,
}

impl RGB {
    pub fn from_u8<T: IntoIterator<Item = u8>>(width: usize, height: usize, v: T) -> RGB {
        let data: Vec<f64> = v.into_iter().map(|v| (v as f64) / 255.0).collect();
        assert!(
            data.len() == width * height * 3,
            "unexpected amount of data"
        );
        RGB {
            width,
            height,
            data,
        }
    }

    pub fn from_u16<T: IntoIterator<Item = u16>>(width: usize, height: usize, v: T) -> RGB {
        let data: Vec<f64> = v.into_iter().map(|v| (v as f64) / 65535.0).collect();
        assert!(
            data.len() == width * height * 3,
            "unexpected amount of data"
        );
        RGB {
            width,
            height,
            data,
        }
    }

    pub fn from_f64(width: usize, height: usize, data: Vec<f64>) -> RGB {
        assert!(
            data.len() == width * height * 3,
            "unexpected amount of data"
        );
        RGB {
            width,
            height,
            data,
        }
    }

    pub fn data(&self) -> &[f64] {
        &self.data
    }

    pub fn iter(&self) -> PixelIter {
        PixelIter {
            source: &self,
            current: 0,
        }
    }

    pub fn with_new_data<T: IntoIterator<Item = (f64, f64, f64)>>(&self, iter: T) -> RGB {
        let data: Vec<f64> = iter
            .into_iter()
            .flat_map(|(r, g, b)| vec![r, g, b])
            .collect();
        assert!(data.len() == self.width * self.height * 3);
        RGB {
            width: self.width,
            height: self.height,
            data,
        }
    }
}

impl<'a> IntoIterator for &'a RGB {
    type Item = (f64, f64, f64);
    type IntoIter = PixelIter<'a>;

    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}

pub struct PixelIter<'a> {
    source: &'a RGB,
    current: usize,
}

impl<'a> Iterator for PixelIter<'a> {
    type Item = (f64, f64, f64);
    fn next(&mut self) -> Option<Self::Item> {
        if self.current >= self.source.width * self.source.height * 3 {
            return None;
        }
        let result = (
            self.source.data[self.current + 0],
            self.source.data[self.current + 1],
            self.source.data[self.current + 2],
        );
        self.current += 3;
        Some(result)
    }
}

pub trait Processor {
    fn num_slots(&self) -> (usize, usize);
    fn process(&self, input: Vec<RGB>) -> Vec<RGB>;
    fn clear_caches(&mut self) {}
}

pub struct InvertProcessor {}

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
mod tests {
    use crate::RGB;

    #[test]
    fn from_u8() {
        let data: Vec<u8> = vec![0, 128, 255];
        let out: RGB = RGB::from_u8(1, 1, data);
        let expected = vec![0.0f64, 128.0 / 255.0, 1.0];
        assert_eq!(out.data(), expected.as_slice());
    }

    #[test]
    #[should_panic]
    fn panic_on_invalid_data() {
        RGB::from_u8(1, 2, vec![1u8, 2, 3, 4, 5]);
    }

    #[test]
    fn iter() {
        let img = RGB::from_f64(2, 1, vec![0f64, 1.0, 2.0, 3.0, 4.0, 5.0]);
        let data: Vec<(f64, f64, f64)> = img.iter().collect();
        assert_eq!(data, vec![(0f64, 1f64, 2f64), (3f64, 4f64, 5f64)]);
        let mut counter = 0;
        for _ in img.iter() {
            counter += 1;
        }
        assert_eq!(counter, 2);

        let mut counter = 0;
        for _ in &img {
            counter += 1;
        }
        assert_eq!(counter, 2);
    }

    #[test]
    fn invert() {
        use crate::{InvertProcessor, Processor};
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
