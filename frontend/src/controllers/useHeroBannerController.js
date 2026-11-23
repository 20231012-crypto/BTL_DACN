/**
 * Hero Banner Controller: manages carousel track animation, touch gestures, parallax tilt, and image preloading.
 */
import { useEffect, useRef, useState } from 'react';

export const HERO_SLIDES = [
  {
    id: 'main',
    src: '/assets/banners/hero-banner-4.webp',
    alt: 'Hộp chăm sóc sức khỏe chính hãng Nhà thuốc An Tâm',
    badge: 'An Tâm chính hãng',
    title: 'Chăm sóc sức khỏe mỗi ngày, miễn phí từ 299.000đ',
    position: 'center 58%',
  },
  {
    id: 'vitamin',
    src: '/assets/banners/hero-banner-2.webp',
    alt: 'Bộ sản phẩm Vitamin C, D3 và Omega-3 Nhà thuốc An Tâm',
    badge: 'Tăng cường đề kháng',
    title: 'Vitamin & Thực phẩm bảo vệ sức khỏe',
    position: 'center 58%',
  },
  {
    id: 'care',
    src: '/assets/banners/hero-banner-3.webp',
    alt: 'Dược sĩ An Tâm kiểm duyệt đơn thuốc và tư vấn sức khỏe',
    badge: 'Dược sĩ đồng hành',
    title: 'Kiểm duyệt tận tâm, tư vấn minh bạch',
    position: 'center 56%',
  },
];

// Reverse-ordered clone track so advancing shifts right smoothly.
export const HERO_TRACK = [
  HERO_SLIDES[0],
  ...HERO_SLIDES.slice(1).reverse(),
  HERO_SLIDES[0],
];
export const HERO_START_POS = HERO_TRACK.length - 1;
const INTERVAL_MS = 5200;

export function useHeroBannerController() {
  const [pos, setPos] = useState(HERO_START_POS);
  const [animated, setAnimated] = useState(true);
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [preloadRest, setPreloadRest] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    const start = () => setPreloadRest(true);
    if (document.readyState === 'complete') {
      const timer = setTimeout(start, 800);
      return () => clearTimeout(timer);
    }
    window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, []);

  const activeIndex = pos === 0 ? 0 : HERO_START_POS - pos;

  const slideRight = () => {
    setAnimated(true);
    setPos((current) => (current <= 0 ? HERO_START_POS - 1 : current - 1));
  };

  const slideLeft = () => {
    setAnimated(true);
    setPos((current) => (current >= HERO_START_POS ? 1 : current + 1));
  };

  const goTo = (index) => {
    setAnimated(true);
    setPos(HERO_START_POS - index);
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setAnimated(true);
      setPos((current) => (current <= 0 ? HERO_START_POS - 1 : current - 1));
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const handleTransitionEnd = () => {
    if (pos === 0) {
      setAnimated(false);
      setPos(HERO_START_POS);
    }
  };

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    setTilt({ x, y });
  };

  const onMouseLeave = () => {
    setPaused(false);
    setTilt({ x: 0, y: 0 });
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current !== null) {
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(delta) > 40) {
        if (delta > 0) slideRight();
        else slideLeft();
      }
      touchStartX.current = null;
    }
    setPaused(false);
  };

  return {
    pos,
    animated,
    paused,
    setPaused,
    tilt,
    preloadRest,
    activeIndex,
    slideRight,
    slideLeft,
    goTo,
    handleTransitionEnd,
    onMouseMove,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
  };
}
