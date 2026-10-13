# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.5.0 - 2026-10-13

### Added
- `build-intl` reads a JSON config via `-c` / `--config` with `supportedLocales` and `compileTo`
- `.arb` files declare `@@locale`, and an optional `@@prefix` prefixes every key in that file
- Translation inputs can be `.arb` files or directories
- Warnings for inconsistent keys and inconsistent placeholder types
- Placeholder types other than `string`, `int`, and `float` are errors. The build reports every error and does not write the output file when any error is present
- Placeholder types are no longer inferred from the variable name. A placeholder without a type warns and is read as `string`

### Changed
- Locale identity comes from `@@locale` instead of the file name
- Key prefixes come from `@@prefix` instead of nested directories
- Omitted config fields default to locales `en-US` and `de-DE`, `compileTo` `typescript`, export name `appTranslation`, and output file `./i18n/translations.ts`
- Placeholder types are `string`, `int`, and `float`
- The config accepts `name`, `outputFile`, and `translationFiles`
- `build-intl` accepts multiple file or directory paths, overwrites the output file, and `--dry-run` prints that diff
- `-c` / `--config` is optional. Without it, the build uses the same defaults as a config with omitted fields
- `int` and `float` placeholders are `number` parameters and are rounded before they are inserted into the translation string

## [0.4.0] - 2025-11-26

### Added
- Added tests for code compiler
- Added more examples
- Added type parsing corrections based on variable names and translate types from other languages like int, or float

### Changed
- Split `lex`, `parse`, and `compile` into different files
- Moved compile function out of compile-arb-script
- Limit exports in index file
- Updated [README.md](README.md)

### Security
- Prevent code injections through typing variables

## [0.3.0] - 2025-11-24

### Added
- add tests for typing and combining translations

### Removed
- Fix typing to be compatible with strict typescript

## [0.2.2] - 2025-11-24

### Changed
- Updated the values parameter type of TranslationEntries to be more specific as a `Record<string, unkown>` rather than a `object`

## [0.2.1] - 2025-11-23

### Added
- Added error logging and catching

### Fixed
- Fix an error when having a locales directory with more than 2 subfolders

## [0.2.0] - 2025-11-23

### Added 
- Add argument to change the generated translation name `-n | --name`
- Add types `TranslationExtension` and `PartialTranslationExtension` to simplify extending translations

### Changed
- Updated README.md example

### Fixed
- Fixed the proper escaping of \, ` and $

## [0.1.0] - 2025-11-21

### Added
- ICU lexer, parser and compiler
- a script for compiling `.arb` to a typesafe translation
- types for translations
- `combineTranslation` function for combining translations

