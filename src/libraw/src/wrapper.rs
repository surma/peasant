use std::ffi;
use std::ops::Drop;

use crate::bindings;

pub const VERSION_MAJOR: u16 = bindings::LIBRAW_MAJOR_VERSION as u16;
pub const VERSION_MINOR: u16 = bindings::LIBRAW_MINOR_VERSION as u16;
pub const VERSION_PATCH: u16 = bindings::LIBRAW_PATCH_VERSION as u16;

pub struct Data(*mut bindings::libraw_data_t, Option<Box<Vec<u8>>>);

impl Data {
    pub fn new() -> Data {
        Data(unsafe { bindings::libraw_init(0) }, None)
    }

    pub fn from_buffer(mut buffer: Box<Vec<u8>>) -> Result<Data, String> {
        let mut data = Data::new();
        let result = unsafe {
            bindings::libraw_open_buffer(
                data.0,
                buffer.as_mut_ptr() as *mut ffi::c_void,
                buffer.len() as u64,
            )
        };
        data.1 = Some(buffer);
        if result != 0 {
            return Err(String::from("Could not open buffer"));
        }

        let result = unsafe { bindings::libraw_unpack(data.0) };
        if result != 0 {
            return Err(String::from("Could not unpack buffer"));
        }
        Ok(data)
    }

    pub fn aperture(&self) -> f32 {
        unsafe { (*self.0).other.aperture }
    }
}

impl Drop for Data {
    fn drop(&mut self) {
        unsafe {
            bindings::libraw_close(self.0);
        }
    }
}
