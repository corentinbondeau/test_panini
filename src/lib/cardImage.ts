export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s\-/]+/g, "");
}

export function slugForImage(firstName: string, lastName: string): string {
  return `${normalizeName(firstName)}${normalizeName(lastName)}`;
}

export function buildImageUrl(
  firstName: string,
  lastName: string,
  category: string,
  occurrenceIndex: number,
): string | null {
  const base = slugForImage(firstName, lastName);

  if (occurrenceIndex === 0) {
    return `/${base}.jpg`;
  }

  const cleanCat = normalizeName(category);
  return `/${base}${cleanCat}.jpg`;
}
