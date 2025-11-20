export type TranslationEntry = string | ((values: object) => string)

export type TranslationEntries = Record<string, TranslationEntry>

export type Translation<L extends string, T extends TranslationEntries = TranslationEntries> = Record<L, T>

export type PartialTranslation<L extends string, T extends TranslationEntries = TranslationEntries> = Partial<Record<L, Partial<T>>>