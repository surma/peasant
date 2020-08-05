#include "libraw/libraw.h"
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

thread_local const val Uint16Array = val::global("Uint16Array");
thread_local const val Uint8ClampedArray = val::global("Uint8ClampedArray");
thread_local const val ImageData = val::global("ImageData");

std::string version() { return std::string(libraw_version()); }

struct DecodedRaw {
  int width;
  int height;
  int bps;
  int num_channels;
  float iso;
  float focal_length;
  float aperture;
  val data = val::null();
};

int demosaic(libraw_data_t *lr, libraw_processed_image_t **pri) {
  lr->params.output_bps = 16;
  // sRGB
  lr->params.gamm[0] = 1 / 2.4;
  lr->params.gamm[1] = 12.92;
  lr->params.no_auto_bright = 1;
  lr->params.use_camera_wb = 0;

  // sRGB
  lr->params.output_color = 1;

  // No crop
  lr->params.cropbox[0] = 0;
  lr->params.cropbox[1] = 0;
  lr->params.cropbox[2] = lr->sizes.raw_width;
  lr->params.cropbox[3] = lr->sizes.raw_height;

  int r;
  r = libraw_dcraw_process(lr);
  if (r != 0) {
    return r;
  }
  *pri = libraw_dcraw_make_mem_image(lr, &r);
  return r;
}

DecodedRaw decode(std::string buffer, int len) {
  libraw_data_t *lr = libraw_init(LIBRAW_OPTIONS_NONE);
  libraw_processed_image_t *pri = NULL;
  int r;
  r = libraw_open_buffer(lr, (void *)buffer.c_str(), len);
  if (r != 0) {
    return DecodedRaw{};
  }
  r = libraw_unpack(lr);
  if (r != 0) {
    return DecodedRaw{};
  }
  r = demosaic(lr, &pri);
  if (r != 0) {
    return DecodedRaw{};
  }

  auto width = pri->width;
  auto height = pri->height;
  auto result = DecodedRaw{.width = width,
                           .height = height,
                           .bps = 16,
                           .num_channels = 3,
                           .iso = lr->other.iso_speed,
                           .focal_length = lr->other.focal_len,
                           .aperture = lr->other.aperture};
  std::unique_ptr<uint16_t[]> rgba(new uint16_t[width * height * 4]);
  uint16_t *rgb = (uint16_t *)pri->data;

  for (int i = 0; i < width * height; i++) {
    rgba[i * 4 + 0] = rgb[i * 3 + 0];
    rgba[i * 4 + 1] = rgb[i * 3 + 1];
    rgba[i * 4 + 2] = rgb[i * 3 + 2];
    rgba[i * 4 + 3] = ~0;
  }
  result.data =
      Uint16Array.new_(typed_memory_view(width * height * 4, rgba.get()));

  libraw_dcraw_clear_mem(pri);
  libraw_close(lr);
  return result;
}

EMSCRIPTEN_BINDINGS(my_module) {
  class_<DecodedRaw>("DecodedRaw")
      .property("width", &DecodedRaw::width)
      .property("height", &DecodedRaw::height)
      .property("bps", &DecodedRaw::bps)
      .property("numChannels", &DecodedRaw::num_channels)
      .property("iso", &DecodedRaw::iso)
      .property("focalLength", &DecodedRaw::focal_length)
      .property("aperture", &DecodedRaw::aperture)
      .property("data", &DecodedRaw::data);

  function("decode", &decode);
  function("version", &version);
}
