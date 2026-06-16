"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

export type EntityTableName = Extract<keyof Database["public"]["Tables"], string>;

const ENTITY_TABLES: readonly EntityTableName[] = [
  "projects",
  "books",
  "chapters",
  "manuscripts",
  "characters",
  "scenes",
  "relationships",
  "cultures",
  "factions",
  "locations",
  "religions",
  "governments",
  "organizations",
  "plot_threads",
  "outlines",
  "glossary_terms",
  "notes",
  "retcons",
  "attachments",
  "eras",
  "themes",
  "languages",
  "species",
  "items",
  "technologies",
  "timeline_events",
];

const SPECIAL_ARRAY_REFERENCE_FIELDS = new Set([
  "themes",
  "primary_regions",
  "primary_themes",
  "main_characters",
  "key_locations",
  "related_plot_threads",
  "key_factions",
  "dominant_themes",
  "associated_cultures",
  "associated_organizations",
]);

const NON_NULLABLE_SCALAR_REFERENCE_FIELDS = new Set([
  "manuscripts.book_id",
  "relationships.entity_a_id",
  "relationships.entity_b_id",
]);

const IGNORED_FIELDS = new Set([
  "id",
  "project_id",
  "user_id",
  "created_at",
  "updated_at",
]);

export async function deleteEntityForProject(
  uid: string,
  projectId: string,
  tableName: EntityTableName,
  entityId: string
) {
  const supabase = getSupabaseBrowserClient();

  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", entityId);

  if (deleteError) {
    throw deleteError;
  }

  for (const currentTable of ENTITY_TABLES) {
    try {
      const { data, error } = await supabase
        .from(currentTable)
        .select("*")
        .eq("user_id", uid)
        .eq("project_id", projectId);

      if (error) {
        if (isMissingTableError(error)) {
          continue;
        }

        throw error;
      }

      for (const row of data ?? []) {
        const nextValues: Record<string, unknown> = {};
        const rowRecord = row as Record<string, unknown>;

        for (const [field, value] of Object.entries(rowRecord)) {
          if (!isReferenceField(field) || !fieldShouldBeCleaned(field, value)) {
            continue;
          }

          if (Array.isArray(value)) {
            const nextArray = value.filter((item) => item !== entityId);

            if (nextArray.length !== value.length) {
              nextValues[field] = nextArray;
            }
            continue;
          }

          if (typeof value === "string" && value === entityId) {
            nextValues[field] = NON_NULLABLE_SCALAR_REFERENCE_FIELDS.has(
              `${currentTable}.${field}`
            )
              ? ""
              : null;
          }
        }

        if (Object.keys(nextValues).length === 0) {
          continue;
        }

        nextValues.updated_at = new Date().toISOString();

        const rowId = typeof rowRecord.id === "string" ? rowRecord.id : null;

        if (!rowId) {
          continue;
        }

        const { error: updateError } = await supabase
          .from(currentTable)
          .update(nextValues)
          .eq("user_id", uid)
          .eq("project_id", projectId)
          .eq("id", rowId);

        if (updateError) {
          if (isMissingTableError(updateError)) {
            break;
          }

          throw updateError;
        }
      }
    } catch (error) {
      if (isMissingTableError(error)) {
        continue;
      }

      throw error;
    }
  }
}

function isReferenceField(field: string) {
  return (
    (field.endsWith("_id") && !IGNORED_FIELDS.has(field)) ||
    field.endsWith("_ids") ||
    SPECIAL_ARRAY_REFERENCE_FIELDS.has(field)
  );
}

function fieldShouldBeCleaned(field: string, value: unknown) {
  return (
    (Array.isArray(value) && (field.endsWith("_ids") || SPECIAL_ARRAY_REFERENCE_FIELDS.has(field))) ||
    (typeof value === "string" && field.endsWith("_id") && !IGNORED_FIELDS.has(field))
  );
}

function isMissingTableError(error: unknown) {
  if (!error) {
    return false;
  }

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "";

  return /no such table/i.test(message);
}
