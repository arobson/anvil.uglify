/*
	anvil.uglify - Uglify extension for anvil.js
	version:	0.1.0
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
/*
    anvil.uglify - Uglify extension for anvil.js
    version:    0.1.0
    author:     Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
    copyright:  2011 - 2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/
var UglifyJS = require( "uglify-js" ),
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
        config:  {
            output: null,
            all: false,
            include: [],
            exclude: [],
            options: null
        },
        configure: function( config, command, done, activity ) {
            var identify, ignoreList = [];
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

            this.sourceMaps = {};
            if ( this.config.sourceMaps ) {
                _.each( this.config.sourceMaps, function( val, key ) {
                    this.sourceMaps[ path.join( "/", key) ] = val;
                }, this);
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
            
            // Convert the output into a list of actual anvil project files.
            if ( this.output ) {
                var newOutput = {};

                // When running in CI mode, don't do this part twice.
                if ( !this.configured ) {
                    _.each( this.output, function( list, key ) {
                    var newList = _.map( list, function( filename ) {
                            var src = anvil.fs.buildPath([ anvil.config.source, filename ]),
                                projectFile = anvil.project.getFile( src );
                            
                            projectFile.noCopy = true;
                            return projectFile;
                        });

                        newOutput[ key ] = newList;
                    }, this);
                    this.output = _.clone( newOutput );
                }
                
                // Build a list of the files to minify.
                //
                //    [{
                //        name: "some.min.js", files: [ ... ]
                //    }, ... ]
                jsFiles = _.map( this.output, function( files, key ) {
                    // The new output file needs to be generated.
                    var data = this.buildFileData( path.join( "/", key ) );
                    data.files = files;
                    return data;
                }, this );

                this.configured = true;
            }
            else {
                if ( this.inclusive ) {
                    jsFiles = include();
                } else if( this.exclusive ) {
                    jsFiles = exclude();
                }
            }
            
            if ( jsFiles.length > 0 ) {
                anvil.log.step( "Uglifying " + jsFiles.length + " files" );
                anvil.scheduler.parallel( jsFiles, this.minify, function() { done(); } );
            }
            else {
                done();
            }
        },

        buildFileData: function( name ){
            var originSpec, workingSpec;

            originSpec = anvil.fs.buildPath( [ anvil.config.source, name ] );
            workingSpec = anvil.fs.buildPath( [ anvil.config.working, name ] );
            data = anvil.fs.buildFileData( anvil.config.source, anvil.config.working, originSpec );

            return data;
        },

        minify: function( file, done ) {
            var self = this,
                // Handles the case of a custom output configuration.
                output = typeof anvil.config.output === "string" ? anvil.config.output : anvil.config.output[ "full" ],
                final, newName,
                // The filename for the sourceMap data.
                fileForSourceMap = path.join( path.basename( output ), file.relativePath, file.name ),
                // The sources for the sourceMap list of sources.
                filesForSourceMap = [ fileForSourceMap ],
                // Minify these(this) file.
                filesToMinify = [ anvil.fs.buildPath([ file.workingPath, file.name ]) ],
                // Is there a sourcemap in the config that matches the current file.
                sourceMapExists = self.sourceMaps[ path.join( file.relativePath, file.name ) ],
                // The actual destination of the sourceMap
                sourceMapDestination = sourceMapExists === true ? fileForSourceMap + ".map" : path.join( output, sourceMapExists ),
                // The actual destination of the sourceMap
                sourceMapActualDestination = sourceMapExists === true ? path.join( anvil.config.working, file.relativePath, file.name ) + ".map"
                    : path.join( anvil.config.working, sourceMapExists  ),
                // Options to pass to uglify.
                uglifyOpts = _.extend({}, this.uglifyOptions, sourceMapExists ? {
                        outSourceMap: sourceMapDestination
                } : {});

            if ( !_.isEmpty(this.output) && file.files.length ) {
                filesToMinify = _.map( file.files, function( file ) {
                    return file.fullPath;
                });
                
                filesForSourceMap = _.map( file.files, function( file ) {
                    return path.join( path.basename( anvil.config.source ), file.relativePath, file.name );
                });
            }

            final = UglifyJS.minify( filesToMinify, uglifyOpts );
            newName = self.rename( file.name );

            if ( final.map != "null"  ) {
                final.code += "\n//@ sourceMappingURL=" + (sourceMapExists === true ? sourceMapDestination : sourceMapExists);
            }

            anvil.fs.write( [ file.workingPath, newName ], final.code, function( err ) {
                if( err ) {
                    anvil.log.error( "Error writing " + file.fullPath + " for uglification: \n" + err.stack );
                } else {
                    var minified = _.clone( file );
                    minified.name = newName;
                    anvil.project.files.push( minified );
                }
                
                if ( final.map != "null" ) {
                    var map = JSON.parse( final.map );
                    map.sources = filesForSourceMap;
                    final.map = JSON.stringify( map );
                    
                    anvil.project.files.push(
                        self.buildFileData( sourceMapExists === true ? path.join( file.relativePath, file.name ) + ".map" : sourceMapExists )
                        );

                    anvil.fs.write( sourceMapActualDestination, final.map, function( err ) {
                        if( err ) {
                            anvil.log.error( "Error writing " + file.fullPath + " for uglification: \n" + err.stack );
                        }

                        done();
                    });
                }
                else {
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