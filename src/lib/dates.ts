export function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the next N Fridays as YYYY-MM-DD strings
 */
export function nextFridays(count = 8): string[] {
  const res: string[] = [];
  const today = new Date();
  const day = today.getDay(); // Sun=0..Sat=6

  const daysUntilFriday = ((5 - day + 7) % 7) || 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);

  for (let i = 0; i < count; i++) {
    const fri = new Date(nextFriday);
    fri.setDate(nextFriday.getDate() + i * 7);
    res.push(toISODate(fri));
  }
  return res;
}

/**
 * Optional — handy for later
 * Returns next N Fri→Sun weekends
 */
export function nextFriSunWeekends(count = 6) {
  const weekends: { departDate: string; returnDate: string }[] = [];
  const fridays = nextFridays(count);

  for (const fri of fridays) {
    const d = new Date(fri);
    const sun = new Date(d);
    sun.setDate(d.getDate() + 2);

    weekends.push({
      departDate: fri,
      returnDate: toISODate(sun),
    });
  }

  return weekends;
}
