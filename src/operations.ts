export enum OperationType {
  OPERATION_DECODE_IMAGE,
  OPERATION_COLORSPACE_CONVERSION,
  OPERATION_APPLY_CURVE,
}

export const enum ColorSpaceConversion {
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
  channel: number;
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
  view.setUint32(4, op.channel, true);
  new Float32Array(view.buffer, view.byteOffset + 8).set(op.curve);
}
