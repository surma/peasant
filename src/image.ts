export interface Image {
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
  data: Float32Array;
}
