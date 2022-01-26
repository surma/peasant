import { clamp, entries, pointDistance } from "./utils.js";

export interface Point {
  x: number;
  y: number;
}

interface DragState {
  lastX: number;
  lastY: number;
  index: number;
}

function hermiteBasis(a: number, b: number): (v: number) => number {
  if (a === 0 && b === 0) return (t) => 2 * t * t * t - 3 * t * t + 1;
  if (a === 1 && b === 0) return (t) => t * t * t - 2 * t * t + t;
  if (a === 0 && b === 1) return (t) => -2 * t * t * t + 3 * t * t;
  if (a === 1 && b === 1) return (t) => t * t * t - t * t;
  throw Error("unreachable");
}

function pointProduct(p: Point, v: number): Point {
  return {
    x: p.x * v,
    y: p.y * v,
  };
}

function pointSum(...points: Point[]): Point {
  const sum: Point = {
    x: 0,
    y: 0,
  };
  for (const p of points) {
    sum.x += p.x;
    sum.y += p.y;
  }
  return sum;
}

function pointDifference(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

function _cubicHermite(
  p0: Point,
  m0: Point,
  p1: Point,
  m1: Point
): (x: number) => Point {
  return (x) => {
    const t = (x - p0.x) / (p1.x - p0.x);
    return pointSum(
      pointProduct(p0, hermiteBasis(0, 0)(t)),
      pointProduct(m0, hermiteBasis(1, 0)(t) * (p1.x - p0.x)),
      pointProduct(p1, hermiteBasis(0, 1)(t)),
      pointProduct(m1, hermiteBasis(1, 1)(t) * (p1.x - p0.x))
    );
  };
}

export function cubicHermite(
  points: Point[],
  tangents: Point[]
): (x: number) => Point {
  const fns = points
    .slice(0, -1)
    .map((_, idx) =>
      _cubicHermite(
        points[idx],
        tangents[idx],
        points[idx + 1],
        tangents[idx + 1]
      )
    );
  return (x: number) => {
    if (x < points[0].x) return points[0];
    if (x >= points.at(-1).x) return points.at(-1);
    let idx = points.findIndex((point) => point.x > x)! - 1;
    return fns[idx](x);
  };
}

function cardinalSplineTangents(
  points: Point[],
  straightness: number
): Point[] {
  straightness = clamp(0, straightness, 1);
  return points.map((_, i) => {
    const prevPoint = points[clamp(0, i - 1, points.length - 1)];
    const nextPoint = points[clamp(0, i + 1, points.length - 1)];
    return pointProduct(
      pointDifference(nextPoint, prevPoint),
      (1 - straightness) / (nextPoint.x - prevPoint.x)
    );
  });
}

export class ToneCurve extends HTMLElement {
  private ctx: CanvasRenderingContext2D;
  private shadow: ShadowRoot;
  private ro: ResizeObserver;
  private dragState: DragState | null = null;
  private _straightness: number = 0;
  public points: Array<Point> = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];
  public maxPoints: number = 8;
  public showGrid: boolean = true;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    const canvas = this.ownerDocument.createElement("canvas");
    canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.ownerDocument.addEventListener(
      "mousemove",
      this.onDragMove.bind(this)
    );
    this.ownerDocument.addEventListener("mouseup", this.onDragEnd.bind(this));
    this.shadow.append(canvas);
    this.ctx = canvas.getContext("2d");

    const style = this.ownerDocument.createElement("style");
    style.innerHTML = `
      canvas {
        position: absolute;
        top: 0;
        left: 0;
        aspect-ratio: unset;
      }
    `;
    this.shadow.append(style);
  }

  set straightness(val) {
    this._straightness = clamp(0, val, 1);
    this.repaint();
  }

  get straightness() {
    return this._straightness;
  }

  connectedCallback() {
    this.ro = new ResizeObserver(this.onResizeObserver.bind(this));
    this.ro.observe(this);
  }

  private clampPoint(p: Point) {
    return {
      x: clamp(0, p.x, 1),
      y: clamp(0, p.y, 1),
    };
  }

  sortedPoints() {
    // Work on a copy
    let copy = this.points.slice();

    // Sort by x coordinate
    copy.sort((p1, p2) => p1.x - p2.x);
    copy = copy.map((point) => this.clampPoint(point));

    return copy;
  }

  private onResizeObserver(entries: ResizeObserverEntry[]) {
    const entry = entries.pop();
    this.ctx.canvas.width = entry.contentRect.width;
    this.ctx.canvas.height = entry.contentRect.height;
    this.repaint();
  }

  get width() {
    return this.ctx.canvas.width;
  }

  get height() {
    return this.ctx.canvas.height;
  }

  private repaint() {
    // Weird reset hack
    this.ctx.canvas.width = this.ctx.canvas.width;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.scale(1, -1);
    this.ctx.translate(0, -this.height);
    this.ctx.save();
    if (this.showGrid) this.paintGrid();
    this.paintLine(3, "black");
    this.paintLine(1, "white");
    this.ctx.restore();
  }

  private paintGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(0, 0, 0, .2)`;
    for (let i = 0.25; i < 1; i += 0.25) {
      this.ctx.beginPath();
      this.ctx.moveTo(0 * this.width, i * this.height);
      this.ctx.lineTo(1 * this.width, i * this.height);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.width, 0 * this.height);
      this.ctx.lineTo(i * this.width, 1 * this.height);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private paintLine(thickness, color) {
    this.ctx.save();
    this.ctx.strokeStyle = this.ctx.fillStyle = color;
    this.ctx.lineWidth = thickness;
    const fn = this.curveFunction();
    this.ctx.beginPath();
    this.ctx.moveTo(0, fn(0).y * this.height);
    for (let t = 0; t < 1; t += 1 / 256) {
      const p = fn(t);
      this.ctx.lineTo(p.x * this.width, p.y * this.height);
    }
    this.ctx.stroke();

    const points = this.sortedPoints();
    for (const { x, y } of points) {
      this.ctx.beginPath();
      this.ctx.arc(
        x * this.width,
        y * this.height,
        thickness * 2,
        0,
        2 * Math.PI
      );
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private clientCoordinatesToCanvasCoordinates(inX: number, inY: number) {
    const bcr = this.ctx.canvas.getBoundingClientRect();
    return {
      x: inX - bcr.left,
      y: inY - bcr.top,
    };
  }

  private canvasCoordinatesToCurveCoordinates(inX: number, inY: number) {
    const { x, y } = this.ctx
      .getTransform()
      .transformPoint(new DOMPoint(inX, inY));
    return {
      x: x / this.ctx.canvas.width,
      y: y / this.ctx.canvas.height,
    };
  }

  private clientCoordinatesToCurveCoordinates(inX: number, inY: number) {
    const { x, y } = this.clientCoordinatesToCanvasCoordinates(inX, inY);
    return this.canvasCoordinatesToCurveCoordinates(x, y);
  }

  get clickRadius() {
    return 10 / Math.min(this.ctx.canvas.width, this.ctx.canvas.height);
  }

  curveFunction(): (v: number) => Point {
    const points = this.sortedPoints();
    const tangents = cardinalSplineTangents(points, this._straightness);
    return cubicHermite(points, tangents);
  }

  private onMouseDown(ev: MouseEvent) {
    if (ev.button === 0) {
      this.onLeftClick(ev);
      return;
    }
    if (ev.button === 2) {
      this.onRightClick(ev);
      return;
    }
  }

  private onRightClick(ev: MouseEvent) {
    let { x, y } = this.clientCoordinatesToCurveCoordinates(
      ev.clientX,
      ev.clientY
    );
    const draggedPointIndex = this.findPointWithinRadius(
      x,
      y,
      this.clickRadius
    );

    if (draggedPointIndex == null) return;
    if (this.points.length <= 2) return;

    ev.preventDefault();
    this.points.splice(draggedPointIndex, 1);
  }

  private onLeftClick(ev: MouseEvent) {
    let { x, y } = this.clientCoordinatesToCurveCoordinates(
      ev.clientX,
      ev.clientY
    );
    const draggedPointIndex = this.findPointWithinRadius(
      x,
      y,
      this.clickRadius
    );

    // Click was close to an existing point, start dragging.
    if (draggedPointIndex != null) {
      this.dragState = {
        index: draggedPointIndex,
        lastX: x,
        lastY: y,
      };
      return;
    }

    // ... otherwise create a new point.

    if (this.points.length >= this.maxPoints) return;

    this.dragState = {
      lastX: x,
      lastY: y,
      index: this.points.length,
    };

    // If the alt key was pressed, create the point on the curve rather than
    // where the mouse is.
    if (ev.altKey) {
      y = this.curveFunction()(x).y;
    }
    this.points.push({ x, y });
  }

  private onDragMove(ev: MouseEvent) {
    const { x, y } = this.clientCoordinatesToCurveCoordinates(
      ev.clientX,
      ev.clientY
    );
    if (this.dragState === null) return;
    ev.preventDefault();
    const point = this.points[this.dragState.index];
    const factor = ev.altKey ? 0.1 : 1;
    point.x += factor * (x - this.dragState.lastX);
    point.y += factor * (y - this.dragState.lastY);
    this.dragState.lastX = x;
    this.dragState.lastY = y;
    this.repaint();
  }

  private onDragEnd(ev: MouseEvent) {
    this.repaint();
    if (this.dragState === null) return;
    this.points[this.dragState.index] = this.clampPoint(
      this.points[this.dragState.index]
    );
    this.dragState = null;
  }

  private findPointWithinRadius(
    x: number,
    y: number,
    radius: number = 0.01
  ): number | null {
    const candidates = this.points
      .map((point, index) => ({
        index,
        point,
        distance: pointDistance(x, y, point.x, point.y),
      }))
      .filter(({ distance }) => distance < radius);
    if (candidates.length <= 0) return null;
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0].index;
  }

  disconnectedCallback() {
    this.ro.disconnect();
    this.ro = null;
  }
}

customElements.define("tone-curve", ToneCurve);
