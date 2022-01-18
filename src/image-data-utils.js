export function toImageData(img) {
  const imgData = new ImageData(img.width, img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      imgData.data[4 * (y * img.width + x) + 0] =
        img.data[3 * (y * img.width + x) + 0] * 255;
      imgData.data[4 * (y * img.width + x) + 1] =
        img.data[3 * (y * img.width + x) + 1] * 255;
      imgData.data[4 * (y * img.width + x) + 2] =
        img.data[3 * (y * img.width + x) + 2] * 255;
      imgData.data[4 * (y * img.width + x) + 3] = 255;
    }
  }
  return imgData;
}
