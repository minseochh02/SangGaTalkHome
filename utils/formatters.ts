/**
 * Utility functions for formatting values
 */

/**
 * Format SGT price with proper comma separators and decimal handling
 * @param price - The price to format (can be number, string, or null)
 * @returns Formatted price string
 */
export const formatSGTPrice = (price: number | string | null): string => {
  if (price === null) return "0";

  // Convert to string if it's not already
  const priceStr = typeof price === "string" ? price : price.toString();

  // Split by decimal point
  const parts = priceStr.split(".");

  // Add commas for thousands in the integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // If there's a decimal part, preserve all decimal places but remove trailing zeros
  if (parts.length > 1) {
    // Remove trailing zeros
    parts[1] = parts[1].replace(/0+$/, "");

    // If decimal part is empty after removing zeros, return just the integer part
    return parts[1].length > 0 ? parts.join(".") : parts[0];
  }

  return parts[0];
};

/**
 * Format Korean Won price with comma separators
 * @param price - The price to format
 * @returns Formatted price string with commas
 */
export const formatKRWPrice = (price: number): string => {
  return price.toLocaleString();
}; 