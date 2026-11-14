import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

type DropZone = 'collection' | 'deck' | 'table' | 'discard';

export function useCardDrag<T>(onDrop: (item: T, target: DropZone) => boolean) {
  const [dragged, setDragged] = useState<T | null>(null);
  const dropRef = useRef(onDrop);
  const cleanupRef = useRef<(() => void) | null>(null);
  const sourceRef = useRef<HTMLElement | null>(null);
  const suppressClick = useRef(false);
  dropRef.current = onDrop;

  useEffect(() => () => cleanupRef.current?.(), []);
  useLayoutEffect(() => {
    if (sourceRef.current && !sourceRef.current.isConnected) {
      cleanupRef.current?.();
      setDragged(null);
    }
  });

  function startDrag(event: PointerEvent<HTMLElement>, item: T, size?: { width: number; height: number }) {
    if (!event.isPrimary || event.button !== 0) return;
    const element = event.currentTarget;
    const button = (event.target as Element).closest('button');
    if (button && button !== element) return;
    cleanupRef.current?.();
    setDragged(null);
    sourceRef.current = element;
    suppressClick.current = false;
    const pointerId = event.pointerId;
    const origin = { x: event.clientX, y: event.clientY };
    let last = { ...origin, time: performance.now() };
    let offset = { x: 0, y: 0 };
    let placeholder: HTMLDivElement | null = null;
    let lifted = false;
    let frame = 0;
    let tiltX = 0;
    let tiltY = 0;
    let rotation = 0;
    let returnAnimation: Animation | null = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function relaxTilt() {
      tiltX *= 0.9;
      tiltY *= 0.9;
      rotation *= 0.9;
      element.style.setProperty('--tilt-x', `${tiltX}deg`);
      element.style.setProperty('--tilt-y', `${tiltY}deg`);
      element.style.setProperty('--drag-rotation', `${rotation}deg`);
      frame = Math.abs(tiltX) + Math.abs(tiltY) + Math.abs(rotation) > 0.05
        ? requestAnimationFrame(relaxTilt) : 0;
    }

    function move(pointer: globalThis.PointerEvent) {
      if (pointer.pointerId !== pointerId) return;
      if (!lifted) {
        if (Math.hypot(pointer.clientX - origin.x, pointer.clientY - origin.y) < 5) return;
        const bounds = element.getBoundingClientRect();
        const width = size?.width ?? element.offsetWidth;
        const height = size?.height ?? element.offsetHeight;
        placeholder = document.createElement('div');
        placeholder.className = 'card-drag-placeholder';
        placeholder.style.width = `${element.offsetWidth}px`;
        placeholder.style.height = `${element.offsetHeight}px`;
        placeholder.setAttribute('aria-hidden', 'true');
        element.before(placeholder);
        offset = {
          x: (origin.x - bounds.left) / bounds.width * width,
          y: (origin.y - bounds.top) / bounds.height * height,
        };
        element.style.setProperty('--drag-width', `${width}px`);
        element.style.setProperty('--drag-height', `${height}px`);
        element.classList.add('is-dragging');
        document.body.classList.add('card-dragging');
        element.setPointerCapture(pointerId);
        lifted = true;
        suppressClick.current = true;
        setDragged(item);
      }
      pointer.preventDefault();
      element.style.setProperty('--drag-left', `${pointer.clientX - offset.x}px`);
      element.style.setProperty('--drag-top', `${pointer.clientY - offset.y}px`);
      if (!reducedMotion) {
        const now = performance.now();
        const elapsed = Math.max(16, now - last.time);
        const vx = (pointer.clientX - last.x) / elapsed;
        const vy = (pointer.clientY - last.y) / elapsed;
        tiltX = Math.max(-28, Math.min(28, -vy * 18));
        tiltY = Math.max(-34, Math.min(34, vx * 22));
        rotation = Math.max(-9, Math.min(9, vx * 5));
        cancelAnimationFrame(frame);
        relaxTilt();
        last = { x: pointer.clientX, y: pointer.clientY, time: now };
      }
    }

    function stopListening() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('lostpointercapture', cancel);
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('blur', cancel);
      cancelAnimationFrame(frame);
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    }

    function cleanup() {
      stopListening();
      returnAnimation?.cancel();
      placeholder?.remove();
      element.classList.remove('is-dragging');
      document.body.classList.remove('card-dragging');
      for (const property of ['--drag-width', '--drag-height', '--drag-left', '--drag-top', '--tilt-x', '--tilt-y', '--drag-rotation']) {
        element.style.removeProperty(property);
      }
      cleanupRef.current = null;
      sourceRef.current = null;
    }

    function finish(pointer: globalThis.PointerEvent) {
      if (pointer.pointerId !== pointerId) return;
      const target = document.elementFromPoint(pointer.clientX, pointer.clientY)
        ?.closest<HTMLElement>('[data-card-drop]')?.dataset.cardDrop as DropZone | undefined;
      if (lifted && target && dropRef.current(item, target)) {
        cleanup();
        setDragged(null);
      } else {
        cancel();
      }
    }

    function cancel(event?: Event) {
      if (event && 'pointerId' in event && event.pointerId !== pointerId) return;
      stopListening();
      if (!lifted || reducedMotion || !element.isConnected) {
        cleanup();
        setDragged(null);
        return;
      }

      // A temporary copy measures the resting pose without pointer capture or hover.
      const bounds = placeholder!.getBoundingClientRect();
      const draggedStyle = getComputedStyle(element);
      const start = {
        transform: draggedStyle.transform,
        transformOrigin: draggedStyle.transformOrigin,
        translate: draggedStyle.translate,
        rotate: draggedStyle.rotate,
        scale: draggedStyle.scale,
      };
      const probe = element.cloneNode(false) as HTMLElement;
      probe.classList.remove('is-dragging');
      probe.style.transition = 'none';
      probe.style.pointerEvents = 'none';
      probe.style.width = placeholder!.style.width;
      probe.style.height = placeholder!.style.height;
      probe.style.removeProperty('--tilt-x');
      probe.style.removeProperty('--tilt-y');
      probe.style.removeProperty('--drag-rotation');
      placeholder!.replaceWith(probe);
      const style = getComputedStyle(probe);
      const destination = {
        width: placeholder!.style.width,
        height: placeholder!.style.height,
        transform: style.transform,
        transformOrigin: style.transformOrigin,
        translate: style.translate,
        rotate: style.rotate,
        scale: style.scale,
      };
      probe.replaceWith(placeholder!);

      returnAnimation = element.animate([
        start,
        { left: `${bounds.left}px`, top: `${bounds.top}px`, minWidth: destination.width, maxWidth: destination.width, ...destination },
      ], { duration: 180, easing: 'cubic-bezier(.22,.7,.25,1)', fill: 'forwards' });
      returnAnimation.onfinish = () => {
        cleanup();
        setDragged(null);
      };
    }

    function keydown(key: KeyboardEvent) {
      if (key.key === 'Escape') {
        key.preventDefault();
        cancel();
      }
    }

    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('lostpointercapture', cancel);
    document.addEventListener('keydown', keydown);
    window.addEventListener('blur', cancel);
    cleanupRef.current = cleanup;
  }

  function onClickCapture(event: MouseEvent) {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  }

  return {
    dragged,
    startDrag,
    onClickCapture,
    onPointerDownCapture: () => { suppressClick.current = false; },
  };
}
