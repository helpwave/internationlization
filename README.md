# helpwave internationlization
helpwaves package for internationalization that creates localized and typesafe translation based on ARB files.

## Usage
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
The lexer, parser and compiler are all tested.