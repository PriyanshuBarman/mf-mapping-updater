export function getNavNDaysAgo(navData, daysAgo) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);

  // Loop from latest to oldest
  for (let i = 0; i < navData.length; i++) {
    const navEntry = navData[i];

    // Parse date properly - MFAPI uses DD-MM-YYYY format
    const [day, month, year] = navEntry.date.split("-");
    const entryDate = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);

    // If this entry is on or before our target date, use it
    if (entryDate <= targetDate) {
      return {
        nav: navEntry.nav,
        date: navEntry.date,
        actualDaysAgo: Math.floor((new Date() - entryDate) / (1000 * 60 * 60 * 24)),
      };
    }
  }

  return null; // if no NAV found on or before target date
}
