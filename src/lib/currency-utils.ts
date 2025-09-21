/**
 * Currency conversion utilities for real pricing display
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  smallestUnit: string;
  decimalPlaces: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    smallestUnit: "kobo",
    decimalPlaces: 2,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    smallestUnit: "cents",
    decimalPlaces: 2,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    smallestUnit: "pence",
    decimalPlaces: 2,
  },
  CAD: {
    code: "CAD",
    symbol: "CAD $",
    name: "Canadian Dollar",
    smallestUnit: "cents",
    decimalPlaces: 2,
  },
};

/**
 * Convert from smallest currency unit to main unit
 * E.g., 150000 kobo -> 1500 NGN
 */
export function convertFromSmallestUnit(
  amount: number,
  currency: string
): number {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
  return amount / Math.pow(10, config.decimalPlaces);
}

/**
 * Convert from main unit to smallest currency unit
 * E.g., 1500 NGN -> 150000 kobo
 */
export function convertToSmallestUnit(
  amount: number,
  currency: string
): number {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
  return Math.round(amount * Math.pow(10, config.decimalPlaces));
}

/**
 * Format price range for display
 */
export function formatPriceRange(
  minAmount: number,
  maxAmount: number,
  currency: string,
  includePerPerson = true
): string {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;

  if (minAmount === 0 && maxAmount === 0) {
    return "Free";
  }

  const minDisplay = convertFromSmallestUnit(minAmount, currency);
  const maxDisplay = convertFromSmallestUnit(maxAmount, currency);

  // Format based on currency
  let formattedRange: string;

  if (currency === "NGN") {
    // Nigerian Naira - show as whole numbers without decimals for large amounts
    formattedRange = `${
      config.symbol
    }${minDisplay.toLocaleString()}-${maxDisplay.toLocaleString()}`;
  } else {
    // Other currencies - show with appropriate decimal places
    formattedRange = `${config.symbol}${minDisplay.toFixed(
      0
    )}-${maxDisplay.toFixed(0)}`;
  }

  return includePerPerson ? `${formattedRange} per person` : formattedRange;
}

/**
 * Format single price for display
 */
export function formatPrice(amount: number, currency: string): string {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
  const displayAmount = convertFromSmallestUnit(amount, currency);

  if (currency === "NGN") {
    return `${config.symbol}${displayAmount.toLocaleString()}`;
  } else {
    return `${config.symbol}${displayAmount.toFixed(0)}`;
  }
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  return SUPPORTED_CURRENCIES[currency]?.symbol || "$";
}

/**
 * Parse price string and convert to smallest unit
 * E.g., "₦1,500" -> 150000 kobo
 */
export function parsePriceString(priceStr: string, currency: string): number {
  // Remove currency symbols and commas
  const cleanStr = priceStr.replace(/[₦$£,\s]/g, "");
  const amount = parseFloat(cleanStr);

  if (isNaN(amount)) return 0;

  return convertToSmallestUnit(amount, currency);
}

/**
 * Estimate currency from country/location
 */
export function estimateCurrencyFromLocation(
  country?: string,
  city?: string
): string {
  if (!country && !city) return "USD";

  const locationStr = `${country || ""} ${city || ""}`.toLowerCase();

  if (
    locationStr.includes("nigeria") ||
    locationStr.includes("lagos") ||
    locationStr.includes("abuja")
  ) {
    return "NGN";
  }

  if (
    locationStr.includes("united kingdom") ||
    locationStr.includes("uk") ||
    locationStr.includes("london") ||
    locationStr.includes("manchester") ||
    locationStr.includes("birmingham")
  ) {
    return "GBP";
  }

  if (
    locationStr.includes("canada") ||
    locationStr.includes("toronto") ||
    locationStr.includes("vancouver") ||
    locationStr.includes("montreal")
  ) {
    return "CAD";
  }

  // Default to USD for US and other countries
  return "USD";
}

/**
 * Get typical price ranges for a country/currency
 */
export function getTypicalPriceRanges(currency: string): {
  budget: { min: number; max: number };
  moderate: { min: number; max: number };
  expensive: { min: number; max: number };
} {
  switch (currency) {
    case "NGN":
      return {
        budget: { min: 50000, max: 150000 }, // ₦500-1,500
        moderate: { min: 150000, max: 400000 }, // ₦1,500-4,000
        expensive: { min: 400000, max: 800000 }, // ₦4,000-8,000
      };

    case "GBP":
      return {
        budget: { min: 800, max: 2000 }, // £8-20
        moderate: { min: 2000, max: 4500 }, // £20-45
        expensive: { min: 4500, max: 8000 }, // £45-80
      };

    case "CAD":
      return {
        budget: { min: 800, max: 2000 }, // CAD $8-20
        moderate: { min: 2000, max: 4500 }, // CAD $20-45
        expensive: { min: 4500, max: 8000 }, // CAD $45-80
      };

    default: // USD
      return {
        budget: { min: 500, max: 1500 }, // $5-15
        moderate: { min: 1500, max: 3500 }, // $15-35
        expensive: { min: 3500, max: 6000 }, // $35-60
      };
  }
}
