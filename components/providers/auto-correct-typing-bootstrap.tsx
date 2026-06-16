"use client";

import { useEffect, useRef } from "react";

import { useAppSettings } from "@/hooks/use-app-settings";

const TEXT_INPUT_TYPES = new Set(["email", "search", "tel", "text", "url"]);
const WORD_BOUNDARY_INSERT_TYPES = new Set(["insertLineBreak", "insertText"]);
const BOUNDARY_CHARACTER_RE = /^[\s.,;:!?'"()\]\}]+$/u;
const WORD_RE = /([\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'\u2019\-]*)$/u;

function isTextEditableTarget(
  target: EventTarget | null
): target is HTMLInputElement | HTMLTextAreaElement {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    return false;
  }

  if (target.disabled || target.readOnly) {
    return false;
  }

  if (target instanceof HTMLInputElement && !TEXT_INPUT_TYPES.has(target.type || "text")) {
    return false;
  }

  return true;
}

function shouldSkipAutoCorrect(target: HTMLInputElement | HTMLTextAreaElement) {
  return target.getAttribute("data-skip-auto-correct") === "true";
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  descriptor?.set?.call(element, value);
}

function preserveSuggestionCasing(originalWord: string, suggestion: string) {
  if (!originalWord || !suggestion) {
    return suggestion;
  }

  if (originalWord === originalWord.toUpperCase()) {
    return suggestion.toUpperCase();
  }

  const firstCharacter = originalWord.charAt(0);
  const restOfWord = originalWord.slice(1);

  if (firstCharacter === firstCharacter.toUpperCase() && restOfWord === restOfWord.toLowerCase()) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1).toLowerCase();
  }

  return suggestion;
}

function getEditableValueAndSelection(
  target: HTMLInputElement | HTMLTextAreaElement
): { selectionEnd: number; selectionStart: number; value: string } | null {
  const selectionStart = target.selectionStart;
  const selectionEnd = target.selectionEnd;

  if (selectionStart === null || selectionEnd === null || selectionStart !== selectionEnd) {
    return null;
  }

  return {
    selectionEnd,
    selectionStart,
    value: target.value,
  };
}

function isWordBoundaryInput(event: InputEvent) {
  if (event.inputType === "insertLineBreak") {
    return true;
  }

  if (event.inputType !== "insertText") {
    return false;
  }

  return typeof event.data === "string" && BOUNDARY_CHARACTER_RE.test(event.data);
}

function isLikelyAcronym(word: string) {
  return word.length <= 4 && word === word.toUpperCase();
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const previousRow = Array.from({ length: b.length + 1 }, (_value, index) => index);
  const currentRow = new Array<number>(b.length + 1);

  for (let row = 1; row <= a.length; row += 1) {
    currentRow[0] = row;

    for (let column = 1; column <= b.length; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      currentRow[column] = Math.min(
        previousRow[column] + 1,
        currentRow[column - 1] + 1,
        previousRow[column - 1] + substitutionCost
      );
    }

    for (let column = 0; column <= b.length; column += 1) {
      previousRow[column] = currentRow[column];
    }
  }

  return previousRow[b.length];
}

function commonPrefixLength(a: string, b: string) {
  const limit = Math.min(a.length, b.length);
  let index = 0;

  while (index < limit && a[index] === b[index]) {
    index += 1;
  }

  return index;
}

function chooseSuggestion(word: string, suggestions: string[]) {
  const normalizedWord = word.toLowerCase();
  const firstLetter = normalizedWord.charAt(0);
  let bestSuggestion: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestPrefixLength = -1;

  for (const rawSuggestion of suggestions) {
    const suggestion = String(rawSuggestion ?? "").trim();

    if (!suggestion) {
      continue;
    }

    const normalizedSuggestion = suggestion.toLowerCase();

    if (!normalizedSuggestion || normalizedSuggestion === normalizedWord) {
      continue;
    }

    if (normalizedSuggestion.charAt(0) !== firstLetter) {
      continue;
    }

    const distance = levenshteinDistance(normalizedWord, normalizedSuggestion);

    if (distance > 2) {
      continue;
    }

    const prefixLength = commonPrefixLength(normalizedWord, normalizedSuggestion);

    if (
      distance < bestDistance ||
      (distance === bestDistance && prefixLength > bestPrefixLength) ||
      (distance === bestDistance &&
        prefixLength === bestPrefixLength &&
        suggestion.length < (bestSuggestion?.length ?? Number.POSITIVE_INFINITY))
    ) {
      bestSuggestion = suggestion;
      bestDistance = distance;
      bestPrefixLength = prefixLength;
    }
  }

  return bestSuggestion;
}

export function AutoCorrectTypingBootstrap() {
  const { loading, settings } = useAppSettings();
  const spellcheckRequestIdRef = useRef(0);

  useEffect(() => {
    if (loading || !settings?.autoCorrectTyping) {
      return;
    }

    const handleBeforeInput = (event: Event) => {
      if (!(event instanceof InputEvent) || !event.cancelable || event.isComposing) {
        return;
      }

      if (!WORD_BOUNDARY_INSERT_TYPES.has(event.inputType) || !isWordBoundaryInput(event)) {
        return;
      }

      const target = event.target;

      if (!isTextEditableTarget(target)) {
        return;
      }

      const editableState = getEditableValueAndSelection(target);

      if (!editableState) {
        return;
      }

      if (shouldSkipAutoCorrect(target)) {
        return;
      }

      const separator = event.inputType === "insertLineBreak" ? "\n" : String(event.data ?? "");

      if (!separator) {
        return;
      }

      const { selectionStart, value } = editableState;
      const beforeCursor = value.slice(0, selectionStart);
      const afterCursor = value.slice(selectionStart);
      const match = beforeCursor.match(WORD_RE);

      if (!match) {
        return;
      }

      const word = match[1];

      if (word.length < 4 || isLikelyAcronym(word)) {
        return;
      }

      const requestId = spellcheckRequestIdRef.current + 1;
      spellcheckRequestIdRef.current = requestId;

      void (async () => {
        const isCorrect = await window.bookBible.spellcheck.correct(word);

        if (spellcheckRequestIdRef.current !== requestId || isCorrect) {
          return;
        }

        const suggestions = await window.bookBible.spellcheck.suggest(word);

        if (spellcheckRequestIdRef.current !== requestId) {
          return;
        }

        const suggestion = chooseSuggestion(word, suggestions);

        if (!suggestion) {
          return;
        }

        const correctedWord = preserveSuggestionCasing(word, suggestion);
        const nextValue =
          beforeCursor.slice(0, beforeCursor.length - word.length) + correctedWord + separator + afterCursor;
        const nextSelectionStart = beforeCursor.length - word.length + correctedWord.length + separator.length;

        setNativeValue(target, nextValue);
        target.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        queueMicrotask(() => {
          try {
            target.setSelectionRange(nextSelectionStart, nextSelectionStart);
          } catch {
            // Ignore selection failures on non-text-like controls.
          }
        });
      })();
    };

    document.addEventListener("beforeinput", handleBeforeInput, true);

    return () => {
      document.removeEventListener("beforeinput", handleBeforeInput, true);
      spellcheckRequestIdRef.current += 1;
    };
  }, [loading, settings?.autoCorrectTyping]);

  return null;
}
