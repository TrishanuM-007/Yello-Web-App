/**
 * Formats a given date (string, timestamp, or Date object) into DD/MM/YYYY.
 * Handles ISO strings and YYYY-MM-DD formats securely.
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '';

  let dateObj;

  // Handle strings that are already YYYY-MM-DD by parsing locally to avoid timezone shifts
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    dateObj = new Date(dateInput);
  }

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return String(dateInput); // Fallback to raw string if invalid
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
};
