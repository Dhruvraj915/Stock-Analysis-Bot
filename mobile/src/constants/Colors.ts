/**
 * Full palette per role, light + dark. Values match the validated reference
 * palette (categorical order, status colors, and diverging pair are fixed —
 * see the dataviz skill's palette.md for the CVD-safety rationale).
 */
const light = {
  text: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  background: '#f9f9f7',
  surface: '#fcfcfb',
  border: 'rgba(11,11,11,0.10)',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',
  tint: '#2a78d6',
  tabIconDefault: '#c3c2b7',
  tabIconSelected: '#2a78d6',

  // Categorical (fixed order — identity, never re-ordered per chart)
  categorical: ['#2a78d6', '#eb6834', '#1baf7a'] as const, // large / mid / small

  // Status (fixed — never themed, never reused for series identity)
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
  neutral: '#898781',

  // Diverging pair (polarity: losses vs gains)
  divergingNeg: '#e34948',
  divergingPos: '#2a78d6',
  divergingMid: '#f0efec',

  successText: '#006300',
};

const dark = {
  text: '#ffffff',
  textSecondary: '#c3c2b7',
  textMuted: '#898781',
  background: '#0d0d0d',
  surface: '#1a1a19',
  border: 'rgba(255,255,255,0.10)',
  gridline: '#2c2c2a',
  baseline: '#383835',
  tint: '#3987e5',
  tabIconDefault: '#383835',
  tabIconSelected: '#3987e5',

  categorical: ['#3987e5', '#d95926', '#199e70'] as const,

  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#e66767',
  neutral: '#898781',

  divergingNeg: '#e66767',
  divergingPos: '#3987e5',
  divergingMid: '#383835',

  successText: '#0ca30c',
};

export default { light, dark };
