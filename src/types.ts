export type TranslationEntry = string | ((values: object) => string)

export type TranslationEntries = Record<string, TranslationEntry>

export type Translation<L extends string, T extends TranslationEntries = TranslationEntries> = Record<L, T>

export type PartialTranslation<L extends string, T extends TranslationEntries = TranslationEntries> = Partial<Record<L, Partial<T>>>

export type TranslationExtension<
  L1 extends string,
  L2 extends string,
  T1 extends TranslationEntries,
  T2 extends TranslationEntries
> = Translation<L1 | L2, T1 & T2>

export type PartialTranslationExtension<
  L1 extends string,
  L2 extends string,
  T1 extends TranslationEntries,
  T2 extends TranslationEntries
> = PartialTranslation<L1 | L2, T1 & T2>