/**
 * Centralized City Matching & Normalization Utilities for RentBuddy ERP
 */

export const normalizeCity = (city?: string): string => {
  if (!city) return '';
  return city
    .toLowerCase()
    .replace(/\s*\(.*\)/g, '') // remove (Head Office), (HO), etc.
    .replace(/[^a-z]/g, '')    // remove punctuation/spaces
    .trim();
};

export const matchCityContext = (itemCityOrAddress?: string, selectedCity?: string): boolean => {
  if (!selectedCity || selectedCity === 'All' || selectedCity === 'All Cities' || selectedCity.toLowerCase().includes('all')) {
    return true;
  }
  if (!itemCityOrAddress) {
    return false;
  }

  const normSelected = normalizeCity(selectedCity);
  const normItem = normalizeCity(itemCityOrAddress);

  if (!normSelected) return true;
  if (!normItem) return false;

  return normItem === normSelected || normItem.includes(normSelected) || normSelected.includes(normItem);
};
