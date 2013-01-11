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

### Updates to UglifyJS V2
This plugin has recently upgraded to the new [UglifyJS2](https://github.com/mishoo/UglifyJS2). Most of the functionallity remains the same, but there are a few new things worth mentioning.

First, there is a new way to set the plugin up.

```json
"anvil.uglify": {
    "output": {
        "js/main.min.js": [
            "another.js",
            "index.js"
        ],
        "js/vendor/deps.min.js": [
            "vendor/jquery.min.js",
            "vendor/knockout-min.js"
        ]
    }
}
```

This new output configuration allows for UglifyJS to do both concating and minifying. Each key in the `output` option is the name of the file being generated, followed by an array of the
files to concat.

**Source Maps**  
The other new feature is [Source Maps](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit). A Source Map is a generated file that helps map a minified or compiled file 
from it's minified version back to it's unminified file. **Note as of 1/11/2013 that only Chrome and possibly FireFox are the only browsers supporting it**.

To generate a source map, simply add the following to your `build.json`.

```json
"anvil.uglify": {
	"sourceMaps": {
		"js/main.min.js": true | "/main.min.js.map"
	},
    "output": {
        "js/main.min.js": [
            "another.js",
            "index.js"
        ],
        "js/vendor/deps.min.js": [
            "vendor/jquery.min.js",
            "vendor/knockout-min.js"
        ]
    }
}
```

There are two ways to add the source map, either by `true`, or by adding a path to where you want the source map. You can use sourceMaps with the normal use case of the plugin as well. As long as the key corresponds to an
actual file in the output. This means that you can still use anvil's normal concating as well as uglifyjs's concating. For example...

```js
// src/index.js

//import("filea.js")
//import("fileb.js")
//import("filec.js")
```

```json
"anvil.uglify": {
	"sourceMaps": {
		"index.min.js": true
	},
	include: [ "index.js" ]
}
```

This will output `lib\index.js`, `lib\index.min.js`, and `lib\index.min.js.map`.

## Contributors
  * Jonathan Creamer - without whom this plugin would still probably be bug ridden :)

    "anvil.uglify": {
        "sourceMaps": {
            "js/main.min.js": "/main.js.map",
            "js/vendor/deps.min.js": "/deps.js.map"
        },
        "options": {
            
        },
        "output": {
            "js/main.min.js": [
                "another.js",
                "index.js"
            ],
            "js/vendor/deps.min.js": [
                "vendor/jquery.min.js",
                "vendor/knockout-min.js"
            ]
        }
    },  