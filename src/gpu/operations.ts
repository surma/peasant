export enum OperationType {
  OPERATION_COLORSPACE_CONVERSION,
  OPERATION_APPLY_CURVE,
}

export enum ColorSpaceConversion {
  XYZ_to_sRGB = 0,
  XYZ_to_xyY,
  sRGB_to_XYZ = 256,
  xyY_to_XYZ,
}

export interface OperationColorspaceConversion {
  type: OperationType.OPERATION_COLORSPACE_CONVERSION;
  conversion: ColorSpaceConversion;
}

export interface OperationApplyCurve {
  type: OperationType.OPERATION_APPLY_CURVE;
  conversion: ColorSpaceConversion;
  inMin: number;
  inMax: number;
  inChannel: number;
  outMin: number;
  outMax: number;
  outChannel: number;
  curve: Float32Array;
}

export type Operation = OperationApplyCurve | OperationColorspaceConversion;

export function encodeOperation(op: Operation, view: DataView) {
  switch (op.type) {
    case OperationType.OPERATION_COLORSPACE_CONVERSION:
      return encodeOperationColorspaceConversion(op, view);
    case OperationType.OPERATION_APPLY_CURVE:
      return encodeOperationApplyCurve(op, view);
  }
}

function encodeOperationColorspaceConversion(
  op: OperationColorspaceConversion,
  view: DataView
) {
  view.setUint32(0, op.conversion, true);
}

function encodeOperationApplyCurve(op: OperationApplyCurve, view: DataView) {
  view.setUint32(0, op.conversion, true);
  view.setFloat32(4, op.inMin, true);
  view.setFloat32(8, op.inMax, true);
  view.setUint32(12, op.inChannel, true);
  view.setFloat32(16, op.outMin, true);
  view.setFloat32(20, op.outMax, true);
  view.setUint32(24, op.outChannel, true);
  new Float32Array(view.buffer, view.byteOffset + 28).set(op.curve);
}
