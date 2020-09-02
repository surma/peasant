use std::ffi;
use std::ops::Drop;

mod bindings;

pub const VERSION_MAJOR: u16 = bindings::LIBRAW_MAJOR_VERSION as u16;
pub const VERSION_MINOR: u16 = bindings::LIBRAW_MINOR_VERSION as u16;
pub const VERSION_PATCH: u16 = bindings::LIBRAW_PATCH_VERSION as u16;

pub enum ColorSpace {
    NotFound = 0,
    SRGB = 1,
    AdobeRGB = 2,
    WideGamutRGB = 3,
    ProPhotoRGB = 4,
    ICC = 5,
    Uncalibrated = 6,
    CameraLinearUniWB = 7,
    CameraLinear = 8,
    CameraGammaUniWB = 9,
    CameraGamma = 10,
    MonochromeLinear = 11,
    MonochromeGamma = 12,
    Unknown = 255,
}

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

    pub fn iso_speed(&self) -> f32 {
        unsafe { (*self.0).other.iso_speed }
    }

    pub fn shutter(&self) -> f32 {
        unsafe { (*self.0).other.shutter }
    }

    pub fn aperture(&self) -> f32 {
        unsafe { (*self.0).other.aperture }
    }

    pub fn focal_length(&self) -> f32 {
        unsafe { (*self.0).other.focal_len }
    }

    pub fn raw_width(&self) -> usize {
        unsafe { (*self.0).sizes.raw_width as usize }
    }

    pub fn raw_height(&self) -> usize {
        unsafe { (*self.0).sizes.raw_height as usize }
    }

    pub fn demosaic(&mut self) -> Result<ProcessedImage, String> {
        unsafe {
            (*self.0).params.output_bps = 16;
            // sRGB
            (*self.0).params.gamm[0] = 1.0 / 2.4;
            (*self.0).params.gamm[1] = 12.92;
            (*self.0).params.no_auto_bright = 1;
            (*self.0).params.use_camera_wb = 0;

            (*self.0).params.output_color = ColorSpace::SRGB as i32;

            // No crop
            (*self.0).params.cropbox[0] = 0;
            (*self.0).params.cropbox[1] = 0;
            (*self.0).params.cropbox[2] = self.raw_width() as u32;
            (*self.0).params.cropbox[3] = self.raw_height() as u32;
        }

        let mut result = unsafe { bindings::libraw_dcraw_process(self.0) };
        if result != 0 {
            return Err(String::from("Could not process raw file"));
        }
        let processed_image_ptr =
            unsafe { bindings::libraw_dcraw_make_mem_image(self.0, &mut result) };
        if result != 0 {
            return Err(String::from("Could not layout processed image in memory"));
        }
        Ok(ProcessedImage(processed_image_ptr))
    }
}

impl Drop for Data {
    fn drop(&mut self) {
        unsafe {
            bindings::libraw_close(self.0);
        }
    }
}

pub struct ProcessedImage(*mut bindings::libraw_processed_image_t);

impl ProcessedImage {
    pub fn width(&self) -> usize {
        unsafe { (*self.0).width as usize }
    }
    pub fn height(&self) -> usize {
        unsafe { (*self.0).height as usize }
    }

    pub fn bps(&self) -> usize {
        unsafe { (*self.0).bits as usize }
    }

    pub fn channels(&self) -> usize {
        unsafe { (*self.0).colors as usize }
    }

    pub fn data(&self) -> &[u16] {
        unsafe {
            std::slice::from_raw_parts(
                &(*self.0).data[0] as *const u8 as *const () as *const u16,
                self.width() * self.height() * self.channels(),
            )
        }
    }
}

impl Drop for ProcessedImage {
    fn drop(&mut self) {
        unsafe {
            bindings::libraw_dcraw_clear_mem(self.0);
        }
    }
}
