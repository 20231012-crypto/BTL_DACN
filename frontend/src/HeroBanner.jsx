import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    id: 'main',
    src: '/assets/banners/pharmacy-hero.webp',
    alt: 'Bao bì sản phẩm chăm sóc sức khỏe An Tâm minh họa',
    badge: 'An Tâm chính hãng',
    title: 'Chăm sóc sức khỏe mỗi ngày',
    position: 'center 68%',
  },
  {
    id: 'vitamin',
    src: '/assets/banners/hero-banner-2.jpg',
    alt: 'Bộ sản phẩm Vitamin C, D3 và Omega-3 Nhà thuốc An Tâm',
    badge: 'Tăng cường đề kháng',
    title: 'Vitamin & Thực phẩm bảo vệ sức khỏe',
    position: 'center 58%',
  },
  {
    id: 'care',
    src: '/assets/banners/hero-banner-3.jpg',
    alt: 'Dược sĩ An Tâm kiểm duyệt đơn thuốc và tư vấn sức khỏe',
    badge: 'Dược sĩ đồng hành',
    title: 'Kiểm duyệt tận tâm, tư vấn minh bạch',
    position: 'center 56%',
  },
  {
    id: 'delivery',
    src: '/assets/banners/hero-banner-4.jpg',
    alt: 'Hộp chăm sóc sức khỏe giao hàng tận nơi An Tâm',
    badge: 'Giao hàng thuận tiện',
    title: 'Đóng gói chu đáo, miễn phí từ 299.000đ',
    position: 'center 58%',
  },
];

// Sắp xếp ngược [clone đầu, ...đảo ngược] để mỗi bước tăng slide sẽ dịch track sang phải.
const TRACK = [SLIDES[0], ...SLIDES.slice(1).reverse(), SLIDES[0]];
const START_POS = TRACK.length - 1;
const INTERVAL_MS = 5200;

export default function HeroBanner() {
  const [pos, setPos] = useState(START_POS);
  const [animated, setAnimated] = useState(true);
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const touchStartX = useRef(null);

  const activeIndex = pos === 0 ? 0 : START_POS - pos;

  const slideRight = () => {
    setAnimated(true);
    setPos((current) => (current <= 0 ? START_POS - 1 : current - 1));
  };

  const slideLeft = () => {
    setAnimated(true);
    setPos((current) => (current >= START_POS ? 1 : current + 1));
  };

  const goTo = (index) => {
    setAnimated(true);
    setPos(START_POS - index);
  };

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => {
      setAnimated(true);
      setPos((current) => (current <= 0 ? START_POS - 1 : current - 1));
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const handleTransitionEnd = () => {
    if (pos === 0) {
      setAnimated(false);
      setPos(START_POS);
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

  return (
    <figure
      className={`hero-photo hero-slider${paused ? ' is-paused' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Banner nổi bật Nhà thuốc An Tâm"
      style={{ '--parallax-x': `${-tilt.x}px`, '--parallax-y': `${-tilt.y}px` }}
    >
      <div
        className={`hero-slider-track${animated ? '' : ' no-transition'}`}
        style={{ transform: `translateX(-${pos * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {TRACK.map((slide, idx) => {
          const isActive = idx === pos;
          return (
            <div
              key={`${slide.id}-${idx}`}
              className={`hero-slide hero-slide-photo${isActive ? ' is-active' : ''}`}
              aria-hidden={!isActive}
            >
              <div className="hero-slide-media">
                <img
                  src={slide.src}
                  alt={slide.alt}
                  width="1200"
                  height="900"
                  style={{ objectPosition: slide.position }}
                  fetchPriority={idx === START_POS ? 'high' : undefined}
                />
                <span className="hero-slide-sheen" aria-hidden="true" />
              </div>
              <div className="hero-slide-caption">
                <span>{slide.badge}</span>
                <strong>{slide.title}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="hero-slider-btn prev"
        onClick={slideLeft}
        aria-label="Banner trước"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        className="hero-slider-btn next"
        onClick={slideRight}
        aria-label="Banner tiếp theo"
      >
        <ChevronRight size={18} />
      </button>

      <div className="hero-slider-dots" role="tablist" aria-label="Chọn banner">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            aria-label={`Xem banner ${index + 1}: ${slide.title}`}
            className={activeIndex === index ? 'active' : ''}
            onClick={() => goTo(index)}
          >
            {activeIndex === index && (
              <span className="hero-dot-progress" key={`${activeIndex}-${pos}`} />
            )}
          </button>
        ))}
      </div>
    </figure>
  );
}
