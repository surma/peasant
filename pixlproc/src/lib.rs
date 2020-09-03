use std::iter::FromIterator;
use std::ops::{Deref, DerefMut};

#[derive(Debug, PartialEq)]
pub struct RGB(Vec<f64>);

impl Deref for RGB {
    type Target = Vec<f64>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for RGB {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl FromIterator<f64> for RGB {
    fn from_iter<T: IntoIterator<Item = f64>>(v: T) -> RGB {
        RGB(v.into_iter().collect())
    }
}

impl FromIterator<u8> for RGB {
    fn from_iter<T: IntoIterator<Item = u8>>(v: T) -> RGB {
        RGB(v.into_iter().map(|v| (v as f64) / 255.0).collect())
    }
}

impl FromIterator<u16> for RGB {
    fn from_iter<T: IntoIterator<Item = u8>>(v: T) -> RGB {
        RGB(v.into_iter().map(|v| (v as f64) / 65535.0).collect())
    }
}

pub trait Processor {}

#[cfg(test)]
mod tests {
    use crate::RGB;

    #[test]
    fn convert_from_u8() {
        let data: Vec<u8> = vec![0, 128, 255];
        let out: RGB = data.into_iter().collect();
        assert_eq!(
            out,
            vec![0.0f64, 128.0 / 255.0, 1.0].into_iter().collect(),
            "Converting [u8] into RGB"
        );
    }
}
