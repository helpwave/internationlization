import {PartialTranslation, TranslationEntries} from "@/src/types";

type Exact<T, U extends T> = U;

/**
 * Merges many translations and outputs the result of the first
 * matching translation
 */
export function combineTranslation<L extends string, T extends TranslationEntries>(
  translations: PartialTranslation<L, T> | PartialTranslation<L, T>[],
  locale: L
) {
  function translation<K extends keyof T>(
    key: K,
    values?: T[K] extends (...args: infer P) => unknown ? Exact<P[0], P[0]> : never
  ): string {
    const usedTranslations = Array.isArray(translations) ? translations : [translations]
    for (const translation of usedTranslations) {
      const localizedTranslation = translation[locale]
      if (!localizedTranslation) continue

      const msg = localizedTranslation[key]
      if (!msg) continue

      if (typeof msg === 'string') {
        return msg
      } else if (typeof msg === 'function') {
        return msg(values as never)
      }
    }
    console.warn(`Missing key or locale for locale "${locale}" and key "${String(key)}" in all translations`)
    return `{{${locale}:${String(key)}}}`
  }

  return translation
}