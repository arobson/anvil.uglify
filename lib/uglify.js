/*
	anvil.uglify - Uglify extension for anvil.js
	version:	0.1.0
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var jsp,
	pro,
	path = require( "path" );

module.exports = function( _, anvil ) {
	anvil.plugin( {
		name: "anvil.uglify",
		activity: "post-process",
		all: false,
		inclusive: false,
		exclusive: false,
		fileList: [],
		commander: [
			[ "-u, --uglify", "uglify all javascript" ]
		],

		configure: function( config, command, done ) {
			if( this.config ) {
				if( this.config.all ) {
					this.all = true;
				} else if ( this.config.include ) {
					this.inclusive = true;
					this.fileList = this.config.include;
				} else if ( this.config.exclude ) {
					this.exclusive = true;
					this.fileList = this.config.exclude;
				}
			}
			
			if( command.uglify ) {
				this.all = true;
			}
			done();
		},

		run: function( done ) {
			if( !this.all && !this.exclusive && !this.inclusive ) {
				done();
				return;
			}

			if ( !jsp || !pro ) {
				jsp = require( "uglify-js" ).parser;
				pro = require( "uglify-js" ).uglify;
			}

			var self = this,
				getRegex = function( sep ) { return anvil.utility.parseRegex( "/[\\" + sep + "]/g" ); },
				osSep = path.sep,
				altSep = osSep === "/" ? "\\" : "/",
				osSepRegex = getRegex( osSep ),
				altSepRegex = getRegex( altSep ),
				useAlternate = false,
				jsFiles = _.filter( anvil.project.files, function( file ) {
					return file.extension() === ".js" && !file.noCopy;
				} ),
				specs = _.map( self.fileList, function( spec ) {
					if( spec.indexOf( altSep ) >= 0 ) {
						useAlternate = true;
					}
					return spec;
				} ),
				any = function( file ) {
					return _.any( specs, function( spec ) {
						return file === spec ||
								anvil.fs.match( [ file ], spec.replace( /^.[\/]/, "/" ), {} ).length > 0;
					} );
				},
				getPath = function( file ) {
					var relative = anvil.fs.buildPath( [ file.relativePath, file.name ] );
					if( useAlternate ) {
						relative = relative.replace( osSepRegex, altSep );
					}
					return relative;
				},
				exclude = function() {
					return _.reject( jsFiles, function( file ) {
						return any( getPath( file ) );
					} );
				},
				include = function() {
					return _.filter( jsFiles, function( file ) {
						return any( getPath( file ) );
					} );
				};

			if ( this.inclusive ) {
				jsFiles = include();
			} else if( this.exclusive ) {
				jsFiles = exclude();
			}
			if( jsFiles.length > 0 ) {
				anvil.log.step( "Uglifying " + jsFiles.length + " files" );
				anvil.scheduler.parallel( jsFiles, this.minify, function() { done(); } );
			} else {
				done();
			}
		},

		minify: function( file, done ) {
			var self = this;
			anvil.fs.read( [ file.workingPath, file.name ], function( content, err ) {
				if( !err ) {
					try {
						ast = jsp.parse( content );
					}
					catch ( e ) {
						anvil.raise( "build.stop", [
							"Uglify parsing has failed in", 
							file.name,
							"at line",
							e.line,
							"col",
							e.col,
							"."].join(" ") );
							
						return;
					}
					ast = pro.ast_mangle( ast );
					ast = pro.ast_squeeze( ast );
					var final = pro.gen_code( ast ),
						newName = self.rename( file.name );

					anvil.fs.write( [file.workingPath, newName ], final, function( err ) {
						if( err ) {
							anvil.log.error( "Error writing " + file.fullPath + " for uglification: \n" + err.stack );
						} else {
							var minified = _.clone( file );
							minified.name = newName;
							anvil.project.files.push( minified );
						}
						done();
					} );
				} else {
					anvil.log.error( "Error reading " + file.fullPath + " for uglification: \n" + err.stack  );
					done();
				}
			} );
		},

		rename: function( name ) {
			if( name.match( /[.]min[.]js$/ ) ) {
				return name;
			} else {
				return name.replace( ".js", ".min.js" );
			}
		}
	} );
};