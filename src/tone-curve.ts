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

export class ToneCurve extends HTMLElement {
  private ctx: CanvasRenderingContext2D;
  private shadow: ShadowRoot;
  private ro: ResizeObserver;
  private dragState: DragState | null = null;
  public points: Array<Point> = [
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.9 },
  ];
  public maxPoints: number = 8;

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

    // Sory by x coordinate
    copy.sort((p1, p2) => p1.x - p2.x);
    copy = copy.map((point) => this.clampPoint(point));

    // Insert artifical start and end points
    copy.unshift({ x: 0, y: copy[0].y });
    copy.push({ x: 1, y: copy[copy.length - 1].y });

    return copy;
  }

  private onResizeObserver(entries: ResizeObserverEntry[]) {
    const entry = entries.pop();
    this.ctx.canvas.width = entry.contentRect.width;
    this.ctx.canvas.height = entry.contentRect.height;
    this.repaint();
  }

  private repaint() {
    // Weird reset hack
    this.ctx.canvas.width = this.ctx.canvas.width;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.scale(1, -1);
    this.ctx.translate(0, -this.ctx.canvas.height);
    this.ctx.save();
    this.paintLine(3, "black");
    this.paintLine(1, "white");
    this.ctx.restore();
  }

  private paintLine(thickness, color) {
    const { width, height } = this.ctx.canvas;
    this.ctx.save();
    this.ctx.strokeStyle = this.ctx.fillStyle = color;
    this.ctx.lineWidth = thickness;
    const points = this.sortedPoints();
    const startPoint = points[0];
    this.ctx.beginPath();
    this.ctx.moveTo(startPoint.x * width, startPoint.y * height);
    for (const { x, y } of points.slice(1)) {
      this.ctx.lineTo(x * width, y * height);
    }
    this.ctx.stroke();

    for (const { x, y } of points.slice(1, -1)) {
      this.ctx.beginPath();
      this.ctx.arc(x * width, y * height, thickness * 2, 0, 2 * Math.PI);
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

  curveFunction(): (v: number) => number {
    const points = this.sortedPoints();
    return (x: number) => {
      for (const [index, value] of points.entries()) {
        if (value.x < x) continue;
        const left = points[index - 1];
        const right = points[index];
        const weight = (x - left.x) / (right.x - left.x);
        return left.y + (right.y - left.y) * weight;
      }
    };
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
      y = this.curveFunction()(x);
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
