/*
	anvil.uglify - Uglify extension for anvil.js
	version:	0.1.0
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var UglifyJS = require( "uglify-js" ),
	path = require( "path" );

module.exports = function( _, anvil ) {
	anvil.plugin( {
		name: "anvil.uglify",
		activities: [ "identify","post-process" ],
		all: false,
		inclusive: false,
		exclusive: false,
		fileList: [],
		commander: [
			[ "-u, --uglify", "uglify all javascript" ]
		],
		config:  {
			output: null,
			all: false,
			include: [],
			exclude: [],
			options: null
		},
		configure: function( config, command, done, activity ) {
			if ( this.config.output && !_.isEmpty( this.config.output ) ) {
				this.output = this.config.output;
			}
			else if ( this.config.all ) {
				this.all = true;
			} else if ( this.config.include.length ) {
				this.inclusive = true;
				this.fileList = this.config.include;
			} else if ( this.config.exclude.length ) {
				this.exclusive = true;
				this.fileList = this.config.exclude;
			}
			
			if( command.uglify ) {
				this.all = true;
			}

			if ( this.config.options ) {
				this.uglifyOptions = this.config.options;
			}
			done();
		},

		run: function( done, activity ) {
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

			if( !this.output && !this.all && !this.exclusive && !this.inclusive ) {
				done();
				return;
			}
			
			if ( this.output ) {
				if ( activity === "identify" ) {
					this.generateOutputFiles(function( files ) {
						this.jsFiles = files;
						done();
					}.bind( this ));
					return;
				}

				jsFiles = this.jsFiles;
			}
			else {
				if ( this.inclusive ) {
					jsFiles = include();
				} else if( this.exclusive ) {
					jsFiles = exclude();
				}
			}
			
			if ( activity === "post-process" ) {
				if( jsFiles.length > 0 ) {
					anvil.log.step( "Uglifying " + jsFiles.length + " files" );
					anvil.scheduler.parallel( jsFiles, this.minify, function() { done(); } );
				} else {
					done();
				}
			}
			else {
				done();
			}
			
		},

		minify: function( file, done ) {
			var self = this;
			anvil.fs.read( [ file.workingPath, file.name ], function( content, err ) {
				if( !err ) {
					var final = UglifyJS.minify( content, _.extend({
							fromString: true
						}, self.uglifyOptions)),
						newName = self.rename( file.name );

					anvil.fs.write( [file.workingPath, newName ], final.code, function( err ) {
						if( err ) {
							anvil.log.error( "Error writing " + file.fullPath + " for uglification: \n" + err.stack );
						} else {
							var minified = _.clone( file );
							minified.name = newName;
							anvil.project.files.push( minified );
						}

						if ( self.uglifyOptions.outSourceMap ) {
							anvil.fs.write( [ anvil.config.working, self.uglifyOptions.outSourceMap ], final.map, function() {
								done();
							});
						}
						else {
							done();
						}
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
		},

		generateOutputFiles: function( done ) {
			var jsFiles = [], calls = [], self = this;

			_.each( this.output, function( files, outputFile ) {
				if ( _.isArray( files ) ) {
					calls.push(function( jsFiles, filesDone ) {
						self.generateOutputFile( outputFile, files, function( newFile ) {
							jsFiles.push( newFile );
							filesDone( jsFiles );
						});
					});
				}
			}, this );

			anvil.scheduler.pipeline( jsFiles, calls, function( result ) {
				done( result );
			});
		},

		generateOutputFile: function( outputFile, files, done ) {
			var content = _.map( files, function( file ) {
                    return "//import('" + file + "')";
                }, this).join( "\n" ),
                originSpec = anvil.fs.buildPath( [ anvil.config.source, outputFile ] ),
                workingSpec = anvil.fs.buildPath( [ anvil.config.working, outputFile ] ),
                data = anvil.fs.buildFileData( anvil.config.source, anvil.config.working, originSpec );
            
            data.concat = true;
            
            anvil.project.files.push( data );
            anvil.fs.write( workingSpec , content, function() {
                done( data );
            });

            return data;
		}
	} );
};