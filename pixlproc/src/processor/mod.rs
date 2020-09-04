use crate::rgb::RGB;
pub mod invert;
pub use invert::InvertProcessor;
pub mod resize;
pub use self::resize::ResizeProcessor;

pub trait Processor {
    fn num_slots(&self) -> (usize, usize);
    fn process(&self, input: Vec<RGB>) -> Vec<RGB>;
    fn clear_caches(&mut self) {}
}
