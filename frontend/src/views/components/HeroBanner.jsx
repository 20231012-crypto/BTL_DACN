/**
 * Hero Banner Slider View powered by useHeroBannerController.
 */
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  HERO_SLIDES,
  HERO_START_POS,
  HERO_TRACK,
  useHeroBannerController,
} from '../../controllers/useHeroBannerController.js';

export default function HeroBanner() {
  const c = useHeroBannerController();

  return (
    <figure
      className={`hero-photo hero-slider${c.paused ? ' is-paused' : ''}`}
      onMouseEnter={() => c.setPaused(true)}
      onMouseMove={c.onMouseMove}
      onMouseLeave={c.onMouseLeave}
      onTouchStart={c.onTouchStart}
      onTouchEnd={c.onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Banner nổi bật Nhà thuốc An Tâm"
      style={{
        '--parallax-x': `${-c.tilt.x}px`,
        '--parallax-y': `${-c.tilt.y}px`,
      }}
    >
      <div
        className={`hero-slider-track${c.animated ? '' : ' no-transition'}`}
        style={{ transform: `translateX(-${c.pos * 100}%)` }}
        onTransitionEnd={c.handleTransitionEnd}
      >
        {HERO_TRACK.map((slide, idx) => {
          const isActive = idx === c.pos;
          return (
            <div
              key={`${slide.id}-${idx}`}
              className={`hero-slide hero-slide-photo${isActive ? ' is-active' : ''}`}
              aria-hidden={!isActive}
            >
              <div className="hero-slide-media">
                <img
                  src={
                    slide.id === HERO_SLIDES[0].id || c.preloadRest
                      ? slide.src
                      : undefined
                  }
                  alt={slide.alt}
                  width="1200"
                  height="896"
                  decoding="async"
                  style={{ objectPosition: slide.position }}
                  fetchPriority={idx === HERO_START_POS ? 'high' : undefined}
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
        onClick={c.slideLeft}
        aria-label="Banner trước"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        className="hero-slider-btn next"
        onClick={c.slideRight}
        aria-label="Banner tiếp theo"
      >
        <ChevronRight size={18} />
      </button>

      <div
        className="hero-slider-dots"
        role="tablist"
        aria-label="Chọn banner"
      >
        {HERO_SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={c.activeIndex === index}
            aria-label={`Xem banner ${index + 1}: ${slide.title}`}
            className={c.activeIndex === index ? 'active' : ''}
            onClick={() => c.goTo(index)}
          >
            {c.activeIndex === index && (
              <span
                className="hero-dot-progress"
                key={`${c.activeIndex}-${c.pos}`}
              />
            )}
          </button>
        ))}
      </div>
    </figure>
  );
}
