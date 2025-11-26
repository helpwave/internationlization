# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

