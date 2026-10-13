# helpwave internationlization
helpwaves package for internationalization that creates localized and typesafe translation based on ARB files.

## Usage
Create a `.arb` file with your translations:
```json
{
  "@@locale": "en-US",
  "priceInfo": "The price is {price}{currency, select, usd{$USD} eur{€} other{}}.",
  "@priceInfo": {
    "placeholders": {
      "price": {
        "type": "float"
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
Each file sets its locale with `@@locale`. An optional `@@prefix` prefixes every key in that file, so a prefix of `test` makes `name` available as `test.name`.

```json
{
  "@@locale": "en-US",
  "@@prefix": "test",
  "name": "Name"
}
```

The file structure could look like this:
```
/locales
-> de-DE.arb
-> en-US.arb
/locales/time
-> de-DE.arb
-> en-US.arb
```

A JSON config file is optional. Pass it with `-c` or `--config`. Every field is optional:
```json
{
  "supportedLocales": ["en-US", "de-DE"],
  "compileTo": "typescript",
  "name": "appTranslation",
  "outputFile": "./i18n/translations.ts",
  "translationFiles": ["./locales", "./shared/locales"]
}
```

Without a config file, and for any omitted field, `supportedLocales`, `compileTo`, `name`, and `outputFile` use the values above. `translationFiles` defaults to an empty list; the sample lists two paths to show that more than one is allowed. `supportedLocales` is the set of locales the project expects. Every placeholder must declare a type of `string`, `int`, or `float`. A missing type is a warning and is read as `string`. Any other type is an error. The build reports every error it finds, and it does not write the output file when any error is present. `compileTo` currently accepts `typescript`. `-n` overrides `name`, and `-o` overrides `outputFile`.

`int` and `float` are `number` parameters in the generated functions. `TranslationGen.round` rounds `int` values before they are inserted into the translation string. `float` values are inserted as given.

Pass one or more `.arb` files or directories. Every `.arb` file under a directory is included. Paths on the command replace `translationFiles` when you provide any.

```bash
npx build-intl ./locales ./shared/locales
npx build-intl --config ./intl.config.json ./locales ./shared/locales
```

An existing output file is overwritten. `--dry-run` prints the diff and does not write the file.

```
Usage: build-intl [options] [location ...]

Options:
  -c, --config <path>   JSON configuration file (optional)
  -o, --out <file>      Output file (overrides config outputFile)
  -n, --name <name>     Exported translation name (overrides config name)
  --dry-run             Print the output diff without writing the file
  -h, --help            Show this help message
```

Keys or placeholder types that differ between locales are reported as warnings.


## Tests
The lexer, parser and compiler are all tested with jest, see [our tests](/tests)

## Examples
Example translation files and the resulting translation can be found in the [examples folder](/examples).

Rebuild the examples:
```bash
npm run build
node dist/scripts/build-intl.js --config ./examples/intl.config.json
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