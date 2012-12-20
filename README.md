## Anvil Uglify Extension

This extension requires anvil.js version 0.9.* or greater.

## Installation

	anvil install anvil.uglify

## Usage

If this extension is installed and enabled, it will automatically minify .js files using the uglify-js node library.

### Minifying All The Things
Add the following snippet to the build.json:

	"anvil.uglify": {
		"all": "true"
	}

### Inclusive Minification
Add the following snippet to the build.json to compile **only** the listed files:

	"anvil.uglify": {
		"include": [
			"./path/to/file1",
			"./path/to/file2",
			"./path/to/file4",
		]
	}

### Exclusive Minification
Add the following snippet to the build.json to compile everything but the listed files:

	"anvil.uglify": {
		"exclude": [
			"./path/to/file1",
			"./path/to/file2",
			"./path/to/file4",
		]
	}

## Contributors
  * Jonathan Creamer - without whom this plugin would still probably be bug ridden :)