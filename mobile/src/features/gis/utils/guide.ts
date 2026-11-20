/** Pure screen-space math for the "nearest evacuation center" guide. No RN, easy to test. */

/** [west, south, east, north] — the visible map bounds. */
export type Bounds = [number, number, number, number]
export interface Size {
    width: number
    height: number
}
export interface Rect {
    left: number
    top: number
    right: number
    bottom: number
}
export interface Point {
    x: number
    y: number
}

export interface GuidePlacement {
    /** True when the target pin is inside the usable rect (so draw it in place). */
    inView: boolean
    /** Where to draw the arrow, in container pixels. */
    x: number
    y: number
    /** Degrees clockwise from "up" — rotate an up-pointing arrow glyph by this. */
    angle: number
}

const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))

/** Project lng/lat to container pixels (web-mercator, linear in the viewport). */
export const toScreen = (bounds: Bounds, size: Size, lng: number, lat: number): Point => {
    const [w, s, e, n] = bounds
    const top = mercatorY(n)
    return {
        x: ((lng - w) / (e - w)) * size.width,
        y: ((top - mercatorY(lat)) / (top - mercatorY(s))) * size.height,
    }
}

/** Distance back from the pin where the in-view arrow sits, so it doesn't cover it. */
const PIN_GAP = 34

/**
 * Where to draw the guide arrow. In view: a short way back from the pin along the
 * user→pin line, pointing at it. Off view: pinned to the edge of `rect` on the ray
 * from the rect's center toward the pin, pointing outward.
 */
export const placeGuide = (
    bounds: Bounds,
    size: Size,
    user: { lng: number; lat: number } | null,
    target: { lng: number; lat: number },
    rect: Rect,
): GuidePlacement => {
    const pin = toScreen(bounds, size, target.lng, target.lat)
    const inView = pin.x >= rect.left && pin.x <= rect.right && pin.y >= rect.top && pin.y <= rect.bottom

    if (inView) {
        const from = user ? toScreen(bounds, size, user.lng, user.lat) : { x: pin.x, y: pin.y - 1 }
        let dx = pin.x - from.x
        let dy = pin.y - from.y
        const len = Math.hypot(dx, dy)
        if (len < PIN_GAP) {
            // User is on top of the pin: just point down at it from above.
            dx = 0
            dy = 1
        } else {
            dx /= len
            dy /= len
        }
        return {
            inView: true,
            x: pin.x - dx * PIN_GAP,
            y: pin.y - dy * PIN_GAP,
            angle: (Math.atan2(dx, -dy) * 180) / Math.PI,
        }
    }

    const cx = (rect.left + rect.right) / 2
    const cy = (rect.top + rect.bottom) / 2
    const dx = pin.x - cx
    const dy = pin.y - cy
    const tx = dx === 0 ? Infinity : (dx > 0 ? rect.right - cx : rect.left - cx) / dx
    const ty = dy === 0 ? Infinity : (dy > 0 ? rect.bottom - cy : rect.top - cy) / dy
    const t = Math.min(tx, ty)
    return {
        inView: false,
        x: cx + dx * t,
        y: cy + dy * t,
        angle: (Math.atan2(dx, -dy) * 180) / Math.PI,
    }
}
