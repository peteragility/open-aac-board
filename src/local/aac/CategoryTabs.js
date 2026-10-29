// Open AAC Board addition, 2026-10-29. GPL-3.0-only; see LICENSE.txt.
import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './UI';

export default function CategoryTabs({
  categories,
  language,
  category,
  query,
  c,
  onSelect
}) {
  const ref = useRef();
  const [edges, setEdges] = useState({ back: false, next: false });
  useEffect(() => {
    const el = ref.current;
    const measure = () =>
      setEdges({
        back: el.scrollLeft > 2,
        next: el.scrollLeft + el.clientWidth < el.scrollWidth - 2
      });
    const resize = window.ResizeObserver ? new ResizeObserver(measure) : null;
    resize?.observe(el);
    el.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      resize?.disconnect();
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [language]);
  useEffect(() => {
    const el = ref.current;
    const active = el.querySelector('[aria-pressed="true"]');
    if (!active) return;
    const outer = el.getBoundingClientRect();
    const inner = active.getBoundingClientRect();
    if (inner.left < outer.left) el.scrollLeft -= outer.left - inner.left;
    else if (inner.right > outer.right)
      el.scrollLeft += inner.right - outer.right;
  }, [category, query, language]);
  function scroll(direction) {
    const el = ref.current;
    el.scrollBy({
      left: direction * Math.max(100, el.clientWidth * 0.7),
      behavior: 'auto'
    });
  }
  return (
    <div className="aac-category-strip">
      <div
        className="aac-categories"
        role="group"
        aria-label={c.board}
        ref={ref}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            aria-pressed={category === cat.id && !query}
            className={category === cat.id && !query ? 'is-active' : ''}
            onClick={() => onSelect(cat.id)}
          >
            <Icon name={cat.icon} />
            {cat[language]}
          </button>
        ))}
      </div>
      {(edges.back || edges.next) && (
        <div className="aac-category-arrows">
          {edges.back && (
            <button
              className="aac-icon-button"
              aria-label={c.previousCategories}
              title={c.previousCategories}
              disabled={!edges.back}
              onClick={() => scroll(-1)}
            >
              <Icon name="arrow" className="aac-arrow-back" />
            </button>
          )}
          <button
            className="aac-icon-button"
            aria-label={c.moreCategories}
            title={c.moreCategories}
            disabled={!edges.next}
            onClick={() => scroll(1)}
          >
            <Icon name="arrow" />
          </button>
        </div>
      )}
    </div>
  );
}
