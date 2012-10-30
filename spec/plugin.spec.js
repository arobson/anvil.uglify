var should = require( "should" );
var _ = require( "underscore" );
var api = require( "anvil.js" );
var Harness = api.PluginHarness;

var harness = new Harness( "anvil.uglify", "./" ),
		tests = [];

harness.addCommandArgs( "--uglify" );
harness.addFile( "./src/test.js",
	"var x = 10;\n" +
	"var y = 5;" );
harness.expectFile( "./lib/test.min.js",
	"var x=10,y=5" );

describe( "when uglifying", function() {

	before( function( done ) {
		harness.build(
			function( x, y ) {
				y.should.equal( x );
			},
			function( results ) {
				tests = results;
				done();
			}
		);
	} );

	it( "should produce expected output", function() {
		_.each( tests, function( test ) {
			test.call();
		} );
	} );
} );