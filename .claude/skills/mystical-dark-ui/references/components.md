# Component Reference — Mystical Dark UI

Extended SVG icon patterns, reusable component code, and layout templates.

## Table of Contents
1. [SVG Celestial Icons](#svg-celestial-icons)
2. [Hero Section Template](#hero-section-template)
3. [Service Card Grid](#service-card-grid)
4. [Navigation Bar](#navigation-bar)
5. [Blog Card Layout](#blog-card-layout)
6. [Zodiac/Category Grid](#zodiac-category-grid)
7. [Chat Interface](#chat-interface)
8. [Star Field Generator](#star-field-generator)

---

## SVG Celestial Icons

Inline SVG icons to use as decorative elements. Render in accent color via `currentColor` or `stroke="currentColor"`.

### Four-Point Star
```svg
<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"/>
</svg>
```

### Crescent Moon
```svg
<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M20 12A8 8 0 1 1 8.5 3.5 6 6 0 0 0 20 12Z"/>
</svg>
```

### Sun with Rays
```svg
<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2">
  <circle cx="24" cy="24" r="8"/>
  <line x1="24" y1="2" x2="24" y2="10"/>
  <line x1="24" y1="38" x2="24" y2="46"/>
  <line x1="2" y1="24" x2="10" y2="24"/>
  <line x1="38" y1="24" x2="46" y2="24"/>
  <line x1="8.5" y1="8.5" x2="14" y2="14"/>
  <line x1="34" y1="34" x2="39.5" y2="39.5"/>
  <line x1="8.5" y1="39.5" x2="14" y2="34"/>
  <line x1="34" y1="14" x2="39.5" y2="8.5"/>
</svg>
```

### All-Seeing Eye
```svg
<svg viewBox="0 0 40 24" width="40" height="24" fill="none" stroke="currentColor" stroke-width="1.2">
  <path d="M2 12 C8 4 16 0 20 0 C24 0 32 4 38 12 C32 20 24 24 20 24 C16 24 8 20 2 12Z"/>
  <circle cx="20" cy="12" r="5"/>
  <circle cx="20" cy="12" r="2" fill="currentColor"/>
</svg>
```

### Lotus
```svg
<svg viewBox="0 0 48 36" width="48" height="36" fill="none" stroke="currentColor" stroke-width="1.2">
  <path d="M24 32 C20 24 12 20 8 24 C12 16 20 14 24 8 C28 14 36 16 40 24 C36 20 28 24 24 32Z"/>
  <path d="M24 32 C22 26 16 22 12 26"/>
  <path d="M24 32 C26 26 32 22 36 26"/>
</svg>
```

### Geometric Mandala (simplified)
```svg
<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="0.8">
  <circle cx="32" cy="32" r="28"/>
  <circle cx="32" cy="32" r="20"/>
  <circle cx="32" cy="32" r="12"/>
  <circle cx="32" cy="32" r="4"/>
  <line x1="32" y1="4" x2="32" y2="60"/>
  <line x1="4" y1="32" x2="60" y2="32"/>
  <line x1="11" y1="11" x2="53" y2="53"/>
  <line x1="53" y1="11" x2="11" y2="53"/>
</svg>
```

---

## Hero Section Template

A full-viewport hero with layered atmosphere.

```jsx
function HeroSection({ title, subtitle, ctaText, ctaHref }) {
  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, var(--bg-deepest), var(--bg-deep) 40%, var(--bg-elevated) 100%)',
    }}>
      {/* Ambient glow orbs */}
      <div style={{
        position: 'absolute', top: '10%', right: '20%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(270,60%,40%,0.12), transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', bottom: '20%', left: '10%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(42,75%,55%,0.08), transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }}/>

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1200, margin: '0 auto', padding: '0 40px',
        width: '100%',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 400,
          color: 'var(--text-primary)', lineHeight: 1.1,
          marginBottom: 24, maxWidth: 600,
          animation: 'fadeInUp 0.8s ease-out forwards',
        }}>
          {title}
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '1.1rem',
          color: 'var(--text-secondary)', maxWidth: 480,
          lineHeight: 1.7, marginBottom: 40,
          animation: 'fadeInUp 0.8s ease-out 0.2s forwards', opacity: 0,
        }}>
          {subtitle}
        </p>
        <a href={ctaHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 32px', borderRadius: 50,
          background: 'hsla(42,75%,55%,0.15)',
          border: '1px solid hsla(42,75%,55%,0.4)',
          color: 'var(--accent-gold)', fontFamily: 'var(--font-body)',
          fontSize: '0.95rem', letterSpacing: '0.03em',
          textDecoration: 'none', cursor: 'pointer',
          animation: 'fadeInUp 0.8s ease-out 0.4s forwards', opacity: 0,
          transition: 'all 0.3s ease',
        }}>
          {ctaText} <span>→</span>
        </a>
      </div>
    </section>
  );
}
```

---

## Service Card Grid

Cards with icons, titles, and descriptions arranged in a responsive grid.

```jsx
function ServiceCard({ icon, title, description, isHighlighted }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isHighlighted ? 'var(--bg-surface)' : 'var(--bg-elevated)',
        border: `1px solid ${hovered || isHighlighted
          ? 'hsla(42,75%,55%,0.3)' : 'var(--border-subtle)'}`,
        borderRadius: 16, padding: 32,
        textAlign: 'center', cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered
          ? '0 8px 40px hsla(270,60%,30%,0.15)' : 'none',
      }}
    >
      <div style={{
        width: 64, height: 64, margin: '0 auto 20px',
        color: 'var(--accent-gold)', opacity: 0.85,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontWeight: 600,
        fontSize: '1.15rem', color: 'var(--text-primary)',
        marginBottom: 12,
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: '0.9rem',
        color: 'var(--text-secondary)', lineHeight: 1.6,
      }}>
        {description}
      </p>
    </div>
  );
}
```

Grid wrapper: `display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px;`

---

## Navigation Bar

Semi-transparent sticky nav with glassmorphism.

```jsx
function NavBar({ logo, links, ctaLabel }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 40px',
      background: 'hsla(255,35%,8%,0.8)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: '1.2rem', color: 'var(--text-primary)',
      }}>
        {logo}
      </div>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        {links.map(link => (
          <a key={link.label} href={link.href} style={{
            fontFamily: 'var(--font-body)', fontSize: '0.9rem',
            color: link.active ? 'var(--text-primary)' : 'var(--text-secondary)',
            textDecoration: 'none', letterSpacing: '0.02em',
            borderBottom: link.active ? '1px solid var(--accent-gold)' : 'none',
            paddingBottom: 4, transition: 'color 0.2s ease',
          }}>
            {link.label}
          </a>
        ))}
        <button style={{
          padding: '10px 24px', borderRadius: 50,
          background: 'var(--accent-gold)', border: 'none',
          color: 'var(--bg-deepest)', fontFamily: 'var(--font-body)',
          fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          letterSpacing: '0.03em',
        }}>
          {ctaLabel}
        </button>
      </div>
    </nav>
  );
}
```

---

## Blog Card Layout

Article preview cards with image, category tag, title, and excerpt.

```jsx
function BlogCard({ imageUrl, category, title, excerpt, readTime }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-elevated)',
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'relative', height: 200, overflow: 'hidden',
      }}>
        <img src={imageUrl} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transition: 'transform 0.4s ease',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}/>
        <span style={{
          position: 'absolute', top: 12, left: 12,
          padding: '4px 12px', borderRadius: 20,
          background: 'hsla(270,60%,50%,0.8)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-body)', fontSize: '0.75rem',
          color: 'var(--text-primary)', letterSpacing: '0.04em',
        }}>
          {category}
        </span>
      </div>
      <div style={{ padding: 24 }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 600,
          fontSize: '1.05rem', color: 'var(--text-primary)',
          marginBottom: 8, lineHeight: 1.4,
        }}>
          {title}
        </h3>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '0.85rem',
          color: 'var(--text-secondary)', lineHeight: 1.6,
          marginBottom: 16,
        }}>
          {excerpt}
        </p>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}>
            {readTime} min read
          </span>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '0.85rem',
            color: 'var(--accent-gold)', letterSpacing: '0.02em',
          }}>
            Read article →
          </span>
        </div>
      </div>
    </article>
  );
}
```

---

## Zodiac/Category Grid

Responsive grid of selectable category items — each with a symbol and label.

```jsx
function CategoryGrid({ items, onSelect, selected }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: 16,
    }}>
      {items.map(item => {
        const isSelected = selected === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              background: isSelected ? 'var(--bg-surface)' : 'var(--bg-elevated)',
              border: `1px solid ${isSelected
                ? 'hsla(42,75%,55%,0.4)' : 'var(--border-subtle)'}`,
              borderRadius: 12, padding: '24px 16px',
              cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.25s ease',
              boxShadow: isSelected
                ? '0 0 20px hsla(42,75%,55%,0.1)' : 'none',
            }}
          >
            <div style={{
              fontSize: '1.5rem', marginBottom: 8,
              color: isSelected ? 'var(--accent-gold)' : 'var(--text-secondary)',
            }}>
              {item.symbol}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: '1rem', color: 'var(--text-primary)',
              marginBottom: 4,
            }}>
              {item.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}>
              {item.subtitle}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

---

## Chat Interface

Dark-themed chat with glass message bubbles.

```jsx
function ChatBubble({ message, isUser }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      <div style={{
        maxWidth: '70%',
        padding: '14px 20px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser
          ? 'hsla(270, 60%, 45%, 0.6)'
          : 'var(--bg-elevated)',
        border: `1px solid ${isUser
          ? 'hsla(270, 60%, 55%, 0.3)' : 'var(--border-subtle)'}`,
        backdropFilter: 'blur(8px)',
        fontFamily: 'var(--font-body)', fontSize: '0.9rem',
        color: 'var(--text-primary)', lineHeight: 1.6,
      }}>
        {message}
      </div>
    </div>
  );
}

function ChatInput({ onSend }) {
  const [text, setText] = React.useState('');
  return (
    <div style={{
      display: 'flex', gap: 12,
      padding: '12px 16px',
      background: 'var(--bg-elevated)',
      borderRadius: 50,
      border: '1px solid var(--border-subtle)',
    }}>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && text.trim()) {
            onSend(text); setText('');
          }
        }}
        placeholder="Write..."
        style={{
          flex: 1, background: 'transparent', border: 'none',
          outline: 'none', color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)', fontSize: '0.9rem',
        }}
      />
      <button
        onClick={() => { if (text.trim()) { onSend(text); setText(''); } }}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--accent-gold)', border: 'none',
          color: 'var(--bg-deepest)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
        }}
      >
        ▸
      </button>
    </div>
  );
}
```

---

## Star Field Generator

CSS-only animated star background. Generate as a utility function and apply to any container.

```css
.starfield {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.starfield::before,
.starfield::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 15% 25%, hsla(0,0%,100%,0.5), transparent),
    radial-gradient(1px 1px at 35% 65%, hsla(0,0%,100%,0.3), transparent),
    radial-gradient(1.5px 1.5px at 55% 15%, hsla(0,0%,100%,0.6), transparent),
    radial-gradient(1px 1px at 75% 45%, hsla(0,0%,100%,0.4), transparent),
    radial-gradient(1px 1px at 90% 80%, hsla(0,0%,100%,0.3), transparent),
    radial-gradient(1.5px 1.5px at 25% 85%, hsla(0,0%,100%,0.5), transparent),
    radial-gradient(1px 1px at 60% 50%, hsla(0,0%,100%,0.2), transparent),
    radial-gradient(1px 1px at 80% 20%, hsla(0,0%,100%,0.4), transparent),
    radial-gradient(1.5px 1.5px at 5% 55%, hsla(0,0%,100%,0.3), transparent),
    radial-gradient(1px 1px at 45% 35%, hsla(0,0%,100%,0.5), transparent);
}

.starfield::after {
  animation: twinkle 4s ease-in-out infinite alternate;
}

@keyframes twinkle {
  from { opacity: 0.3; }
  to { opacity: 0.8; }
}
```

Use `<div className="starfield" />` as the first child in the page container.
