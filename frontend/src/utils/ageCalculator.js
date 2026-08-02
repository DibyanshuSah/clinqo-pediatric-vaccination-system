import dayjs from 'dayjs';

/**
 * Calculates exact age from Date of Birth in "Years / Months / Days" format.
 * Omits years if 0, and omits months if 0.
 * Examples:
 *  - 2 Years / 3 Months / 15 Days
 *  - 4 Months / 12 Days (when years === 0)
 *  - 1 Year / 5 Days (when months === 0)
 *  - 10 Days (when years === 0 and months === 0)
 */
export const calculateAgeYMD = (dobString) => {
  if (!dobString) return '--';
  const dob = dayjs(dobString);
  const now = dayjs();

  if (!dob.isValid()) return '--';
  if (dob.isAfter(now)) return '0 Days';

  let years = now.year() - dob.year();
  let months = now.month() - dob.month();
  let days = now.date() - dob.date();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = now.subtract(1, 'month').daysInMonth();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
  }
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
  }

  return parts.join(' / ');
};

/**
 * Calculates pediatric age from Date of Birth in short format (e.g. "2 yrs 1 mt", "6 mt 12 days", "15 days")
 */
export const calculatePediatricAgeShort = (dobString) => {
  if (!dobString) return '';
  const dob = dayjs(dobString);
  const now = dayjs();

  if (!dob.isValid()) return '';
  if (dob.isAfter(now)) return '0 days';

  let years = now.year() - dob.year();
  let months = now.month() - dob.month();
  let days = now.date() - dob.date();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = now.subtract(1, 'month').daysInMonth();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) {
    parts.push(`${years} yrs`);
  }
  if (months > 0) {
    parts.push(`${months} mt`);
  }
  if (days > 0 && years === 0) {
    parts.push(`${days} days`);
  }
  if (parts.length === 0) {
    parts.push(`${days} days`);
  }

  return parts.join(' ');
};

