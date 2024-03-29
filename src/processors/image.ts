export interface Image<T = Float32Array> {
  rawWidth: number;
  rawHeight: number;
  width: number;
  height: number;
  iso: number;
  focalLength: number;
  aperture: number;
  shutter: number;
  flip: number;
  colors: number;
  bits: number;
  data: T;
}

export function isImage(v: any): v is Image {
  return v && "iso" in v;
}
