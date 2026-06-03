const DRAFT_STATUSES = ["pending-review", "approved", "rejected", "applied"];
const DRAFT_ACTIONS = ["create", "update", "merge"];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateDraftBundle(input, expectedProjectId) {
  const errors = [];

  if (!isRecord(input)) {
    return {
      draft: null,
      errors: ["Draft file must contain a JSON object."],
      valid: false,
    };
  }

  if (!isNonEmptyString(input.id)) {
    errors.push("Draft `id` is required.");
  }

  if (!isNonEmptyString(input.projectId)) {
    errors.push("Draft `projectId` is required.");
  } else if (
    isNonEmptyString(expectedProjectId) &&
    input.projectId.trim() !== expectedProjectId.trim()
  ) {
    errors.push(
      `Draft projectId \`${input.projectId}\` does not match the current project \`${expectedProjectId}\`.`
    );
  }

  if (!isNonEmptyString(input.createdAt)) {
    errors.push("Draft `createdAt` is required.");
  }

  if (!isNonEmptyString(input.sourceFile)) {
    errors.push("Draft `sourceFile` is required.");
  }

  if (!DRAFT_STATUSES.includes(input.status)) {
    errors.push(
      `Draft \`status\` must be one of: ${DRAFT_STATUSES.join(", ")}.`
    );
  }

  if (!isNonEmptyString(input.summary)) {
    errors.push("Draft `summary` is required.");
  }

  if (!Array.isArray(input.proposedChanges) || input.proposedChanges.length === 0) {
    errors.push("Draft must contain at least one `proposedChanges` item.");
  }

  if (Array.isArray(input.proposedChanges)) {
    input.proposedChanges.forEach((change, index) => {
      if (!isRecord(change)) {
        errors.push(`proposedChanges[${index}] must be an object.`);
        return;
      }

      if (!isNonEmptyString(change.slice)) {
        errors.push(`proposedChanges[${index}].slice is required.`);
      }

      if (!DRAFT_ACTIONS.includes(change.action)) {
        errors.push(
          `proposedChanges[${index}].action must be one of: ${DRAFT_ACTIONS.join(
            ", "
          )}.`
        );
      }

      if (!isNonEmptyString(change.targetId)) {
        errors.push(`proposedChanges[${index}].targetId is required.`);
      }

      if (!isNonEmptyString(change.confidence)) {
        errors.push(`proposedChanges[${index}].confidence is required.`);
      }

      if (!isNonEmptyString(change.reason)) {
        errors.push(`proposedChanges[${index}].reason is required.`);
      }

      if (!isRecord(change.fields)) {
        errors.push(`proposedChanges[${index}].fields must be an object.`);
      }
    });
  }

  return {
    draft: errors.length === 0 ? input : null,
    errors,
    valid: errors.length === 0,
  };
}

function parseDraftText(rawText, expectedProjectId) {
  try {
    const parsed = JSON.parse(rawText);
    return validateDraftBundle(parsed, expectedProjectId);
  } catch (error) {
    return {
      draft: null,
      errors: [
        error instanceof Error
          ? `Invalid JSON: ${error.message}`
          : "Invalid JSON.",
      ],
      valid: false,
    };
  }
}

module.exports = {
  DRAFT_ACTIONS,
  DRAFT_STATUSES,
  parseDraftText,
  validateDraftBundle,
};
