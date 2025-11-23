# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-11-23

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

