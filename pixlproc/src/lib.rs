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

pub trait Pipeline {
    fn process(input: Vec<RGB>) -> Vec<RGB>;
    fn clear_caches() {}
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
}
