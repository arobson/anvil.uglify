var jsp = require( "uglify-js" ).parser;
var pro = require( "uglify-js" ).uglify;

var uglifyFactory = function( _, anvil ) {
	return anvil.plugin( {
		name: "anvil.uglify",
		activity: "post-process",
		all: false,
		inclusive: false,
		exclusive: false,
		fileList: [],
		commander: [
			[ "-u, --uglify", "uglify all javascripts" ]
		],

		configure: function( config, command, done ) {
			if( config["anvil.config"] ) {
				if( config["anvil.uglify"].all ) {
					this.all = true;
				} else if ( config["anvil.uglify"].include ) {
					this.inclusive = true;
					this.fileList = config["anvil.uglify"].include;
				} else if (config["anvil.uglify"].exclude ) {
					this.exclusive = true;
					this.fileList = config["anvil.uglify"].exclude;
				}
			} else if( command.uglify ) {
				this.all = true;
			}
			done();
		},

		run: function( done ) {
			var jsFiles = [];
			if ( this.inclusive ) {
				jsFiles = this.inclusive;
			} else {
				jsFiles = _.filter( anvil.project.files, function( file ) {
					return file.extension() === ".js";
				} );

				if( this.exclusive ) {
					jsFiles = _.reject( jsFiles, function( file ) {
						return _.any( this.fileList, function( excluded ) {
							return excluded.fullPath === file.fullPath;
						} );
					} );
				}
			}
			anvil.log.step( "Uglifying " + jsFiles.length + " files" );
			anvil.scheduler.parallel( jsFiles, this.minify, function() { done(); } );
		},

		minify: function( file, done ) {
			var self = this;
			anvil.fs.read( [ file.workingPath, file.name ], function( content, err ) {
				if( !err ) {
					ast = jsp.parse( content );
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
			return name.replace( ".js", ".min.js" );
		}
	} );
};

module.exports = uglifyFactory;