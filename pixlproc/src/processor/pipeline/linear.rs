use std::ops::{Deref, DerefMut};

use crate::{processor::Processor, RGB};

pub struct LinearPipeline<T: Processor> {
    pipeline: Vec<T>,
}

impl<T: Processor> LinearPipeline<T> {
    pub fn new() -> LinearPipeline<T> {
        LinearPipeline {
            pipeline: Vec::new(),
        }
    }
}

impl<T: Processor> Deref for LinearPipeline<T> {
    type Target = Vec<T>;
    fn deref(&self) -> &Self::Target {
        &self.pipeline
    }
}

impl<T: Processor> DerefMut for LinearPipeline<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.pipeline
    }
}

impl<T: Processor> Processor for LinearPipeline<T> {
    fn num_slots(&self) -> (usize, usize) {
        self.pipeline
            .get(0)
            .map(|proc| proc.num_slots())
            .unwrap_or((0, 0))
    }

    fn process(&self, input: Vec<RGB>) -> Vec<RGB> {
        let mut current = input;
        for processor in &self.pipeline {
            let (num_in, num_out) = processor.num_slots();
            assert!(num_in == current.len());
            current = processor.process(current);
        }
        current
    }
}
