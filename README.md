# helpwave internationlization
helpwaves package for internationalization that creates localized and typesafe translation based on ARB files.

## Usage
Create a `.arb` file with your translations:
```json
{
  "priceInfo": "The price is {price}{currency, select, usd{$USD} eur{€} other{}}.",
  "@priceInfo": {
    "placeholders": {
      "price": {
        "type": "number"
      },
      "currency": {}
    }
  }
}
```
And get a translation:

```typescript
import {combineTranslation} from "@helpwave/internationalization";
import {Translation} from "@helpwave/internationalization";

translations["en-US"].priceInfo?.({price, currency})

type ExtensionType = { name: string } 
const extension: Translation<"fr-FR", ExtensionType> = {
  "fr-FR": {
    name: "Charlemagne"
  }
}

const t = combineTranslation([translations, extension], "en-US")
// typesafe on both function parameters 
// and handles errors automatically -> return = {{${locale}:${String(key)}}}
t("priceInfo", { price, currency })
```

## Getting Started
#### Install the package
```
npm install -D @helpwave/internationalization
```
#### Create local ARB files
The file structure could look like this:
```
/locales
-> de-DE.arb
-> en-US.arb
/locales/time
-> de-DE.arb
-> en-US.arb
```

Then run:
```bash
npx build-intl 
```

By default `./locales` will be translated to `./i18n`, the input directory and output file are configurable with:
```
Usage: i18n-compile [options]

Options:
  -i, --in <dir>        Input directory containing .arb files
  -o, --out <file>      Output file (e.g. ./i18n/translations.ts)
  -f, --force           Overwrite output without prompt
  -h, --help            Show this help message
`)
```


## Tests
The lexer, parser and compiler are all tested with jest, see [our tests](/tests)

## Examples
Example translation files and the resulting translation can be found in the [examples folder](/examples).

Rebuild the examples:
```bash
npm run build
node dist/scripts/compile-arb.js --force -i ./examples/locales -o ./examples/translations/translations.ts -n "exampleTranslation"
```

React hook example:
```typescript
type UseHidetideTranslationOverwrites = {
  locale?: HightideTranslationLocales,
}

type HidetideTranslationExtension<L extends string, T extends TranslationEntries>
  = PartialTranslationExtension<L, HightideTranslationLocales, T, HightideTranslationEntries>

export function useHightideTranslation<L extends string, T extends TranslationEntries>(
  extensions?: SingleOrArray<HidetideTranslationExtension<L,T>>,
  overwrites?: UseHidetideTranslationOverwrites
) {
  const { locale: inferredLocale } = useLocale()
  const locale = overwrites?.locale ?? inferredLocale
  const translationExtensions = ArrayUtil.resolveSingleOrArray(extensions)

  return combineTranslation<L | HightideTranslationLocales, T & HightideTranslationEntries>([
    ...translationExtensions,
    hightideTranslation as HidetideTranslationExtension<L,T>
  ], locale)
}
```