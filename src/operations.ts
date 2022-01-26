export const enum OperationType {
  OPERATION_COLORSPACE_CONVERSION,
  OPERATION_APPLY_CURVE,
}

export interface OperationColorspaceConversion {
  type: OperationType.OPERATION_COLORSPACE_CONVERSION;
  conversion: number;
}

export interface OperationApplyCurve {
  type: OperationType.OPERATION_APPLY_CURVE;
  conversion: number;
  curve: number[];
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
  view.setUint32(0, op.conversion);
}

function encodeOperationApplyCurve(op: OperationApplyCurve, view: DataView) {}
