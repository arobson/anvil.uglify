[![build status](https://secure.travis-ci.org/arobson/anvil.uglify.png)](http://travis-ci.org/arobson/anvil.uglify)
## Anvil Uglify Plugin

This plugin requires anvil.js version 0.8.* or greater.

## Installation

	anvil install anvil.uglify

## Usage

If this plugin is installed and enabled, it will automatically minify .js files using the uglify-js node library.

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