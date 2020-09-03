#[derive(Debug, PartialEq)]
pub struct RGB {
    width: usize,
    height: usize,
    data: Vec<f64>,
}

impl RGB {
    fn from_u8<T: IntoIterator<Item = u8>>(width: usize, height: usize, v: T) -> RGB {
        RGB {
            width,
            height,
            data: v.into_iter().map(|v| (v as f64) / 255.0).collect(),
        }
    }

    fn from_u16<T: IntoIterator<Item = u16>>(width: usize, height: usize, v: T) -> RGB {
        RGB {
            width,
            height,
            data: v.into_iter().map(|v| (v as f64) / 65535.0).collect(),
        }
    }

    fn data(&self) -> &[f64] {
        &self.data
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
        assert_eq!(out.data(), expected.as_slice(), "Converting [u8] into RGB");
    }
}
