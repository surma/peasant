#include "libraw/libraw.h"
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

std::string version() { return std::string(LibRaw::version()); }

enum class ColorSpace { raw, sRGB, Adobe, Wide, ProPhoto, XYZ, ACES };

void extract_meta(val &data, LibRaw &imageproc, libraw_processed_image_t *img) {
  auto width = imageproc.imgdata.sizes.width;
  auto height = imageproc.imgdata.sizes.height;
  auto size = width * height;

  data.set("raw_width", imageproc.imgdata.sizes.raw_width);
  data.set("raw_height", imageproc.imgdata.sizes.raw_height);
  data.set("width", width);
  data.set("height", height);
  data.set("iso", imageproc.imgdata.other.iso_speed);
  data.set("focal_length", imageproc.imgdata.other.focal_len);
  data.set("aperture", imageproc.imgdata.other.aperture);
  data.set("shutter", imageproc.imgdata.other.shutter);
  data.set("flip", imageproc.imgdata.sizes.flip);
}

int demosaic(LibRaw &imageproc) {
  imageproc.output_params_ptr()->output_bps = 16;

  // Disable processing
  imageproc.output_params_ptr()->no_auto_bright = 1;
  imageproc.output_params_ptr()->use_camera_wb = 0;

  // sRGB as output space
  imageproc.output_params_ptr()->output_color =  std::__to_underlying(ColorSpace::XYZ);

  // No crop, I guess?
  imageproc.output_params_ptr()->cropbox[0] = 0;
  imageproc.output_params_ptr()->cropbox[1] = 0;
  imageproc.output_params_ptr()->cropbox[2] = imageproc.imgdata.sizes.raw_width;
  imageproc.output_params_ptr()->cropbox[3] =
      imageproc.imgdata.sizes.raw_height;

  // Don’t apply rotation
  imageproc.output_params_ptr()->user_flip = 0;

  return imageproc.dcraw_process();
}

val decode(std::string data) {
  LibRaw imageproc;
  if (imageproc.open_buffer((void *)data.c_str(), data.size()) != 0) {
    return val(std::string("Opening failed"));
  }

  if (imageproc.unpack() != 0) {
    return val(std::string("Unpacking failed"));
  }
  if (demosaic(imageproc) != 0) {
    return val(std::string("Demosaic failed"));
  }
  auto image = imageproc.dcraw_make_mem_image();

  auto result = val::object();
  extract_meta(result, imageproc, image);
  result.set("colors", image->colors);
  result.set("bits", image->bits);

  result.set("data", val(typed_memory_view(image->data_size / 2, reinterpret_cast<uint16_t*>(image->data))));

  LibRaw::dcraw_clear_mem(image);
  return result;
}

EMSCRIPTEN_BINDINGS(my_module) { function("decode", &decode); }
