export interface Point {
  x: number
  y: number
}

export interface FlyingDot {
  id: string
  origin: Point
  destination: Point
  color: string
}
