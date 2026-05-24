export function toFirestoreData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toFirestoreData(item)) as T
  }

  if (value && typeof value === "object") {
    if (value.constructor && value.constructor.name !== "Object") {
      return value
    }

    const output: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(value)) {
      if (typeof nestedValue === "undefined") continue
      output[key] = toFirestoreData(nestedValue)
    }

    return output as T
  }

  return value
}
