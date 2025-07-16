#include "libraw/libraw.h"
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

std::string version() {
  return std::string(LibRaw::version());
}

enum class ColorSpace { raw, sRGB, Adobe, Wide, ProPhoto, XYZ, ACES, P3, Rec2020 };

void extract_meta(val &data, LibRaw *imageproc, libraw_processed_image_t *img) {
  auto width = imageproc->imgdata.sizes.width;
  auto height = imageproc->imgdata.sizes.height;
  auto size = width * height;

  data.set("rawWidth", imageproc->imgdata.sizes.raw_width);
  data.set("rawHeight", imageproc->imgdata.sizes.raw_height);
  data.set("width", width);
  data.set("height", height);
  data.set("iso", imageproc->imgdata.other.iso_speed);
  data.set("focalLength", imageproc->imgdata.other.focal_len);
  data.set("aperture", imageproc->imgdata.other.aperture);
  data.set("shutter", imageproc->imgdata.other.shutter);
  data.set("flip", imageproc->imgdata.sizes.flip);
  data.set("colors", img->colors);
  data.set("bits", img->bits);
}

val decode(std::string data, ColorSpace cs) {
  LibRaw *imageproc = new LibRaw;
  // 16 bit per channel
  imageproc->output_params_ptr()->output_bps = 16;

  // Disable some processing
  imageproc->output_params_ptr()->no_auto_bright = 1;
  imageproc->output_params_ptr()->use_camera_wb = 0;
  // Don’t apply rotation
  imageproc->output_params_ptr()->user_flip = 0;

  // Rec.2020 as output space
  imageproc->output_params_ptr()->output_color = static_cast<int>(cs);  ;


  if (imageproc->open_buffer((void *)data.c_str(), data.size()) != 0) {
    return val(std::string("Opening failed"));
  }
  if (imageproc->unpack() != 0) {
    return val(std::string("Unpacking failed"));
  }
  if(imageproc->dcraw_process() != 0) {
    return val(std::string("Demosaic failed"));
  }

  auto image = imageproc->dcraw_make_mem_image();

  auto result = val::object();
  extract_meta(result, imageproc, image);

  result.set("data",
             val(typed_memory_view(image->data_size / 2,
                                   // Yes this is correct lol
                                   reinterpret_cast<uint16_t *>(image->data))));

  LibRaw::dcraw_clear_mem(image);
  delete imageproc;
  return result;
}

EMSCRIPTEN_BINDINGS(decoder) {
  function("decode", &decode);
  function("version", &version);
  enum_<ColorSpace>("ColorSpace")
  .value("raw", ColorSpace::raw)
  .value("sRGB", ColorSpace::sRGB)
  .value("Adobe", ColorSpace::Adobe)
  .value("Wide", ColorSpace::Wide)
  .value("ProPhoto", ColorSpace::ProPhoto)
  .value("XYZ", ColorSpace::XYZ)
  .value("ACES", ColorSpace::ACES)
  .value("P3", ColorSpace::P3)
  .value("Rec2020", ColorSpace::Rec2020);
}
