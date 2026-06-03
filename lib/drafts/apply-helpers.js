function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueArray(values) {
  return Array.from(
    new Set((values ?? []).filter((value) => value !== null && value !== undefined && value !== ""))
  );
}

function appendText(baseValue, suffixValue) {
  const left = String(baseValue ?? "").trim();
  const right = String(suffixValue ?? "").trim();

  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left.includes(right) ? left : `${left}\n\n${right}`;
}

function mergeFieldValue(currentValue, nextValue) {
  if (Array.isArray(currentValue) || Array.isArray(nextValue)) {
    return uniqueArray([
      ...(Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []),
      ...(Array.isArray(nextValue) ? nextValue : nextValue ? [nextValue] : []),
    ]);
  }

  if (
    currentValue &&
    typeof currentValue === "object" &&
    nextValue &&
    typeof nextValue === "object" &&
    !Array.isArray(currentValue) &&
    !Array.isArray(nextValue)
  ) {
    return {
      ...currentValue,
      ...nextValue,
    };
  }

  return nextValue;
}

function applyFieldPatch(baseRecord, fields, mode) {
  const nextRecord = { ...baseRecord };

  Object.entries(fields ?? {}).forEach(([key, value]) => {
    if (key.endsWith("Append")) {
      const targetKey = key.slice(0, -6);
      nextRecord[targetKey] = appendText(nextRecord[targetKey], value);
      return;
    }

    if (mode === "merge" && key in nextRecord) {
      nextRecord[key] = mergeFieldValue(nextRecord[key], value);
      return;
    }

    nextRecord[key] = value;
  });

  if (!nextRecord.slug) {
    const candidate = nextRecord.title || nextRecord.name || nextRecord.term || nextRecord.id;
    nextRecord.slug = slugify(candidate) || nextRecord.id;
  }

  return nextRecord;
}

module.exports = {
  applyFieldPatch,
  slugify,
  uniqueArray,
};
