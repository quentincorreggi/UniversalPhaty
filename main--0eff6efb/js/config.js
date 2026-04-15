// Global game state and constants.
// Every UniversalPhaty game starts from a file like this. Add your own
// globals, constants, and configuration here. Files loaded after this
// one can read and write these directly (vanilla JS, no modules).

var canvas = null;   // the <canvas> element
var ctx = null;      // its 2D rendering context
var W = 0;           // canvas width, in pixels
var H = 0;           // canvas height, in pixels

var entities = [];   // active entities in the world
var tick = 0;        // frame counter
var lastT = 0;       // last frame timestamp, used to compute dt
