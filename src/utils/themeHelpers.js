/**
 * Utility to generate a full CSS variable color palette from a base category color.
 */

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Creates a slightly darker/tinted version of a color for backgrounds
 * This follows the HSL logic: keep some saturation, drop lightness way down.
 */
function getDarkTint(hex) {
  // Simple approximation: 10% of the original RGB values
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * 0.1)}, ${Math.round(g * 0.1)}, ${Math.round(b * 0.1)})`;
}

export const CATEGORY_COLORS = {
  'Performance': '#C3F832',
  'Standings': '#FD04DC',
  'Voting': '#259ADD',
  'Social': '#FD5D22',
  'Meta': '#FFD700',
};

export function getCategoryPalette(category = 'Performance') {
  const primary = CATEGORY_COLORS[category] || CATEGORY_COLORS['Performance'];
  
  return {
    '--theme-primary': primary,
    '--theme-dark': getDarkTint(primary),
    '--theme-mid': hexToRgba(primary, 0.15),
    '--theme-subtle': hexToRgba(primary, 0.08),
    '--theme-border': hexToRgba(primary, 0.35),
    '--theme-glow': hexToRgba(primary, 0.5),
    '--theme-glow-tight': hexToRgba(primary, 0.2),
    '--theme-gradient-start': hexToRgba(primary, 0.8), // Slightly more opaque for gradient starts
    '--theme-gradient-end': primary,
  };
}
