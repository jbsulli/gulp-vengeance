'use strict';

var objectAssign = require('object-assign');
var through = require('through2');
var defaultPug = require('pug');
var ext = require('gulp-util').replaceExtension;
var PluginError = require('gulp-util').PluginError;
var log = require('gulp-util').log;
var withVengeance = require('vengeance');
var File = require('vinyl');
var path = require('path');

var Sass = withVengeance.Sass;
var Scripts = withVengeance.Scripts;

module.exports = function gulpVengeance(pug_options, vengeance_options) {
    var opts = objectAssign({}, pug_options);
    var pug = opts.pug || opts.jade || defaultPug;

    opts.data = objectAssign(opts.data || {}, opts.locals || {});

    var sass, scripts, cwd, base;
    var sass_file = 'css/styles.css';
    var sass_map_file = 'maps/styles.css.map';
    var scripts_file = 'js/scripts.js';
    var scripts_map_file = 'maps/scripts.js.map';

    return through.obj(
        function compileVengeance(file, enc, cb) {
            var data = objectAssign({}, opts.data, file.data || {});

            opts.filename = file.path;
            file.path = ext(file.path, opts.client ? '.js' : '.html');

            if (file.isStream()) {
                return cb(new PluginError('gulp-pug', 'Streaming not supported'));
            }

            if (file.isBuffer()) {
                try {
                    var compiled;
                    var contents = String(file.contents);
                    if (opts.verbose === true) {
                        log('compiling file', file.path);
                    }

                    if (!sass) {
                        sass = new Sass(sass_file);
                        scripts = new Scripts(scripts_file);
                        cwd = file.cwd;
                        base = file.base;
                    }

                    if (opts.client) {
                        compiled = pug.compileClient(contents, withVengeance(opts, { sass:sass, scripts:scripts }));
                    } else {
                        compiled = pug.compile(contents, withVengeance(opts, { sass:sass, scripts:scripts }))(data);
                    }
                    file.contents = new Buffer(compiled);
                } catch (e) {
                    return cb(new PluginError('gulp-pug', e));
                }
            }
            cb(null, file);
        },
        function splitVengeanceFiles(cb) {
            var src, filepath;
            if (sass && cwd && base) {
                src = sass.compile();
                filepath = path.join(base, sass_file);
                this.push(new File({
                    cwd: cwd,
                    base: base,
                    path: filepath,
                    contents: src.css
                }));
                filepath = path.join(base, sass_map_file);
                this.push(new File({
                    cwd: cwd,
                    base: base,
                    path: filepath,
                    contents: src.map
                }));
            }
            if (scripts && cwd && base) {
                src = scripts.compile();
                if(src){
                    filepath = path.join(base, scripts_file);
                    this.push(new File({
                        cwd: cwd,
                        base: base,
                        path: filepath,
                        contents: src.js
                    }));
                    filepath = path.join(base, scripts_map_file);
                    this.push(new File({
                        cwd: cwd,
                        base: base,
                        path: filepath,
                        contents: src.map
                    }));
                }
            }
            sass = undefined;
            scripts = undefined;
            cwd = undefined;
            base = undefined;
            cb();
        });
};