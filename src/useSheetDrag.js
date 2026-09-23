import { useRef } from 'react'
import { flushSync } from 'react-dom'

// drag the mobile bottom sheet down by its handle / header row. still two positions only (open / collapsed), same as Hide.
// while dragging, the sheet follows your finger by writing its transform straight onto the element (no react re-render
// per move, so it keeps up). on release it either collapses or springs back, handing the motion back to the css transition

const DESKTOP = '(min-width: 1024px)' // the desktop pane doesn't drag
const COLLAPSE_FRACTION = 0.25 // let go past a quarter of the sheet's height -> collapse
const FLICK_SPEED = 0.5 // or flick down faster than this (px per ms) -> collapse
const DEAD_ZONE = 4 // px of movement before it counts as a drag rather than a tap

export function useSheetDrag(panelRef, setPanelExpanded) {
  const drag = useRef(null)

  function onPointerDown(e) {
    if (window.matchMedia(DESKTOP).matches) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // only the handle and the empty part of the header row start a drag, never a button or field
    if (!e.target.closest('[data-drag-zone]') || e.target.closest('button, a, input')) return
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
      height: panelRef.current.offsetHeight,
      moved: false,
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId) // keep getting moves even if the finger leaves the sheet
    } catch {
      // capture can be refused (e.g. the pointer already ended); the drag still works while the finger stays on the sheet
    }
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const dy = Math.max(0, e.clientY - d.startY) // down only; it's already fully open
    if (!d.moved && dy < DEAD_ZONE) return
    d.moved = true
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt
    d.lastY = e.clientY
    d.lastT = e.timeStamp
    const panel = panelRef.current
    panel.style.transition = 'none' // follow the finger exactly, no easing lag
    panel.style.transform = `translateY(${dy}px)`
  }

  function onPointerUp(e) {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    if (!d.moved) return
    const panel = panelRef.current
    const dy = Math.max(0, e.clientY - d.startY)
    panel.style.transition = '' // back to the css slide
    if (dy > d.height * COLLAPSE_FRACTION || d.velocity > FLICK_SPEED) {
      // apply the collapsed class right now (not on the next render), so the slide continues from where the finger let go
      flushSync(() => setPanelExpanded(false))
    }
    panel.style.transform = '' // css takes over: slides on down to collapsed, or springs back up to open
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
