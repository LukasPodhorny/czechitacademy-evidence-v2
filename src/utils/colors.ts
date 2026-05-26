// Generate a unique, vibrant color based on a string (category name)
// Uses HSL color space with optimized saturation and lightness for distinct, readable colors
export function generateColorFromString(str: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Use golden ratio conjugate for better hue distribution
    const goldenRatioConjugate = 0.618033988749895;

    // Generate hue from hash (0-360)
    let hue = (Math.abs(hash) * goldenRatioConjugate) % 1;
    hue = Math.floor(hue * 360);

    // Use higher saturation for more vibrant, distinct colors
    const saturation = 75 + (Math.abs(hash) % 15); // 75-90%

    // Use moderate lightness for good readability on white backgrounds
    const lightness = 45 + (Math.abs(hash >> 4) % 15); // 45-60%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Get a contrasting text color (black or white) based on background lightness
export function getContrastColor(hslColor: string): string {
    // Extract lightness from HSL string
    const match = hslColor.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
    if (!match) return '#000';

    const lightness = parseInt(match[1], 10);
    return lightness > 55 ? '#000' : '#fff';
}

// Generate a lighter version of the color for backgrounds
export function generateLightColor(hslColor: string): string {
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return '#f0f0f0';

    const h = match[1];
    const s = match[2];
    // Much lighter for background
    return `hsl(${h}, ${s}%, 90%)`;
}
