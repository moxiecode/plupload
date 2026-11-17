var UglifyJS = require('uglify-js');
var fs = require('fs');
var vm = require('vm');
var path = require('path');
var crypto = require('crypto');
var utils = require('./Utils');
var reporter = require('./reporter');

var currentReporter = reporter.create();

var _options = {
	version: null,
	releaseDate: null,
	from: "src/**/*.js",
    baseDir: "src",
    rootNS: null, // compiled modules will be exposed to this namespace
    compress: true, // can be object of options to pass to compressor
    expose: "public",
    verbose: true,
    force: true,
    hash: null, // identifies the build, if not specified hash will be generated internally
    outputSource: false,
    outputMinified: "lib.min.js",
    outputDev: false,
    outputCoverage: false,
    
    /* external libraries 
    { 
    	'jquery': {
    		rootNS: null,
    		baseDir: 'js/',
    		expose: 'public'
    	}
    }
    */
    libs: {},
    moduleOverrides: {}, // a way to override some modules with custom source
    globalModules: false, // not sure what this one does
    
    reporter: null
};




function log(reporter, level, message) {
	if (reporter && reporter[level]) {
		reporter[level](message);
	}
}


function dump(astNode) {
	for (var name in UglifyJS) {
		var func = UglifyJS[name];

		if (typeof(func) == "function" && astNode instanceof func) {
			currentReporter.debug(name);
		}
	}
}


function getPublicModules(modules) {
	var publicModules = [];
	modules.forEach(function(module) {
		if (module.isPublic) {
			publicModules.push(module);
		}
	});
	return publicModules;
}


function idToVarName(id) {
	return '__' + id.replace(/[\.\/]/g, '_');
}


function instrumentCode(path, source) {
	var Instrument = require('coverjs').Instrument;

	return new Instrument(source, {
		name: path
	}).instrument();
}


function parseModules(options) {
	var modules = [], loadedPaths = {};
	
	if (options) {
		utils.extend(_options, options);
	}

	// Returns true/false if the module is to be exposed to the global namespace or not
	function isExposed(id, source) {
		var exposeOptions = getLibFromId(id) || _options;

		if (exposeOptions.expose !== false) {
			// Specific modules to expose
			if (exposeOptions.expose instanceof Array && exposeOptions.expose.indexOf(id) == -1) {
				return false;
			}

			// Only modules that are public according to jsdoc
			if (exposeOptions.expose == "public") {
				var matches, docCommentRegExp = /\/\*\*([\s\S]+?)\*\//g;

				for (matches = docCommentRegExp.exec(source); matches; matches = docCommentRegExp.exec(source)) {
					var docComment = matches[1];

					var classNameMatch = /\@class\s+(.+)/g.exec(docComment);
					if (classNameMatch) {
						if (normalize(classNameMatch[1]) === id) {
							if (/@private/.test(docComment)) {
								return false;
							}
						}
					}
				}
			}

			return true;
		}

		return false;
	}

	// Returns library options if the id is part of a dependent lib
	function getLibFromId(id) {
		// Resolve id from dependent libraries
		for (var libName in _options.libs) {
			var lib = _options.libs[libName];

			if (id.indexOf(libName + '/') === 0) {
				return lib;
			}
		}
	}

	function resolveId(id) {
		id = normalize(id);

		// Resolve external library id
		var lib = getLibFromId(id);
		if (lib) {
			if (lib.rootNS) {
				id = id.replace(normalize(lib.rootNS).replace(/[\/]$/, '') + '/', '');
			}

			return utils.toUnixPath(path.join(lib.baseDir, id + ".js"));
		}

		// Resolve internal id
		if (_options.rootNS) {
			id = id.replace(normalize(_options.rootNS).replace(/[\/]$/, '') + '/', '');
		}

		return utils.toUnixPath(path.join(_options.baseDir, id + ".js"));
	}

	function resolvePath(filePath) {
		if (!/\.js$/.test(filePath)) { // seems to be an id or not js file
			filePath = resolveId(filePath);
		}

		if (/^[^\/\\]/.test(filePath)) { // do not resolve if begins with slash
			filePath = path.resolve(_options.baseDir, filePath);
		}

		return utils.toUnixPath(filePath);
	}

	function normalize(id) {
		return id.replace(/\./g, '/');
	}

	function shouldLoadModule(id) {
		id = normalize(id);

		for (var libName in _options.libs) {
			if (id.indexOf(libName + '/') === 0) {
				return true;
			}
		}

		return !_options.rootNS || id.indexOf(normalize(_options.rootNS)) === 0;
	}

	function parseModule(filePath, moduleFilePath) {
		var source;

		// module might be passed as object containing full source
		if (typeof filePath === 'object') {
			source = filePath.source || '';
			filePath = filePath.filePath;
		}

		filePath = utils.toUnixPath(filePath);
		//filePath = resolvePath(filePath);

		if (loadedPaths[filePath]) {
			return;
		}

		loadedPaths[filePath] = true;

		if (typeof filePath === 'string' && !source) {
			if (fs.existsSync(filePath)) {
				source = utils.getFileContents(filePath);
			} else {
				if (moduleFilePath) {
					currentReporter.fatal("Could not find module file: " + filePath + " in " + moduleFilePath + ".");
				} else {
					currentReporter.fatal("Could not find module file: " + filePath + ".");
				}

				return;
			}
		}

		if (_options.version) {
			var version = _options.version.split('.');

			source = source.replace(/@@version@@/g, _options.version);
			source = source.replace(/@@majorVersion@@/g, version.shift());
			source = source.replace(/@@minorVersion@@/g, version.join('.'));
		}

		if (_options.releaseDate) {
			source = source.replace(/@@releaseDate@@/g, _options.releaseDate);
		}

		currentReporter.debug("Parsing module file: " + filePath);

		try {
			vm.runInNewContext(source, {
				define: function(id, deps, func) {
					var moduleFilePath = resolveId(id);

					deps.forEach(function(id) {
						var depFilePath = resolveId(id);

						if (_options.moduleOverrides && _options.moduleOverrides[id]) {
							depFilePath = _options.moduleOverrides[id];
						}

						if (!loadedPaths[depFilePath] && shouldLoadModule(id)) {
							parseModule(depFilePath, moduleFilePath);
						}
					});

					modules.push({
						filePath: filePath,
						source: source,
						id: id,
						deps: deps,
						isPublic: isExposed(id, source)
					});
				}
			});
		} catch(ex) {
			currentReporter.fatal(filePath + ': ' + ex.toString());
		}
	}

	utils.findFiles(_options.from, _options.baseDir).forEach(function(filePath) {
		parseModule(filePath);
	});

	return modules;
}


function mangleModuleIds(body) {
	var ast, value, args, elements, moduleIds = [], lookup = {}, id;

	for (var i = 0; i < body.length; i++) {
		ast = body[i].body;

		if (ast instanceof UglifyJS.AST_Call && ast.expression.name === "define") {
			args = ast.args;

			if (args.length == 3) {
				if (args[0] instanceof UglifyJS.AST_String) {
					id = args[0].value, varName = idToVarName(id);

					args[0] = new UglifyJS.AST_SymbolVar({
						name: varName
					});

					if (!lookup[id]) {
						moduleIds.push({
							id: id,
							varName: varName
						});

						lookup[id] = true;
					}
				}

				if (args[1] instanceof UglifyJS.AST_Array) {
					elements = args[1].elements;

					for (var ei = 0; ei < elements.length; ei++) {
						if (elements[ei] instanceof UglifyJS.AST_String) {
							var depId = elements[ei].value;

							elements[ei] = new UglifyJS.AST_SymbolVar({
								name: idToVarName(depId)
							});

							if (!lookup[depId]) {
								moduleIds.push({
									id: depId,
									varName: idToVarName(depId)
								});

								lookup[depId] = true;
							}
						}
					}
				} else {
					elements = [];
				}

				if (args[2] instanceof UglifyJS.AST_Function) {
					if (elements.length !== args[2].argnames.length) {
						currentReporter.error("Module defs are not equal to define function args for module: " + id);
					}
				}
			}
		}
	}

	var moduleVarDef = [];

	moduleIds.forEach(function(module) {
		moduleVarDef.push(new UglifyJS.AST_VarDef({
			name : new UglifyJS.AST_SymbolVar({
				name: module.varName
			}),

			value: new UglifyJS.AST_String({
				value: module.id
			})
		}));
	});

	body.unshift(new UglifyJS.AST_Var({
		definitions: moduleVarDef
	}));
}


function exposeModules(body, publicModules) {
	var moduleIdArray = [];

	publicModules.forEach(function(module) {
		moduleIdArray.push(new UglifyJS.AST_SymbolVar({name: idToVarName(module.id)}));
	});

	body.push(new UglifyJS.AST_SimpleStatement({
		body: new UglifyJS.AST_Call({
			expression: new UglifyJS.AST_SymbolRef({name: "expose"}),
			args: [new UglifyJS.AST_Array({elements: moduleIdArray})]
		})
	}));
}


function compileMinified(modules) {
	var toplevel, loader, innerScope, compressor, source;

	utils.removeDuplicates(modules); // make sure items do not repeat (might happen when modules is constructed manually)

	if (_options.outputMinified) {
		modules.forEach(function(module) {
			toplevel = UglifyJS.parse(module.source, {
				filename: module.filePath,
				toplevel: toplevel
			});
		});

		mangleModuleIds(toplevel.body);
		exposeModules(toplevel.body, getPublicModules(modules));

		// Inject code into loader
		loader = UglifyJS.parse(utils.getFileContents(path.join(__dirname, "AmdInlineLoader.js")));
		innerScope = loader.body[0].body.expression.body;
		innerScope.splice(-1);
		toplevel.body.forEach(function(stmt) {
			innerScope.push(stmt);
		});
		toplevel = loader;
		toplevel.figure_out_scope();

		// Compress and mangle
		if (_options.compress) {
			if (typeof _options.compress !== 'object') {
				_options.compress = {unused: false};
			}

			compressor = UglifyJS.Compressor(_options.compress); // TODO: Fix this
			toplevel = toplevel.transform(compressor);
			toplevel.figure_out_scope();
			toplevel.compute_char_frequency();
			toplevel.mangle_names();
		}

		source = toplevel.print_to_string({ascii_only: true, beautify: false});

		if (_options.version && _options.releaseDate) {
			source = "// " + _options.version + " (" + (_options.releaseDate) + ")\n" + source;
		}

		currentReporter.info("Writing minified version output to: " + utils.toUnixPath(_options.outputMinified));

		fs.writeFileSync(utils.createDirForFile(_options.outputMinified), source);
	}
}


function compileSource(modules, instrument) {
	utils.removeDuplicates(modules); // make sure items do not repeat (might happen when modules is constructed manually)

	var source = "";
	var outFile = instrument ? _options.outputCoverage : _options.outputSource;

	// Generate source version
	modules.forEach(function(module) {
		source += "// Included from: " + module.filePath + "\n\n";

		if (instrument) {
			source += instrumentCode(module.filePath, module.source) + "\n\n";
		} else {
			source += module.source.trim() + "\n\n";
		}

		if (_options.globalModules && _options.globalModules[module.id]) {
			source += 'var ' + _options.globalModules[module.id] + ' = modules["' + module.id + '"];\n\n';
		}
	});

	// Write expose call for public modules
	var publicModules = getPublicModules(modules);
	if (publicModules.length > 0) {
		var exposeCall = "expose([";

		publicModules.forEach(function(module, i) {
			exposeCall += (i > 0 ? ',' : '') + '"' + module.id + '"';
		});

		exposeCall += "]);";
		source += exposeCall;
	}

	var inlineLoaderSrc = utils.getFileContents(path.join(__dirname, "AmdInlineLoader.js"));
	source = inlineLoaderSrc.replace(/\s*\$code\(\);/g, function() {
		return "\n\n" + source.trim();
	});

	currentReporter.info("Writing " + (instrument ? "coverage" : "source") + " version output to: " + outFile);

	if (_options.version && _options.releaseDate) {
		source = "// " + _options.version + " (" + (_options.releaseDate) + ")\n\n" + source;
	}

	fs.writeFileSync(utils.createDirForFile(outFile), source);
}


function compileDevelopment(modules) {
	var source = "";

	utils.removeDuplicates(modules); // make sure items do not repeat (might happen when modules is constructed manually)

	if (_options.outputDev) {
		// Add expose call
		var publicModules = getPublicModules(modules);
		if (publicModules.length > 0) {
			source += "\n\texpose([";

			publicModules.forEach(function(module, i) {
				source += (i > 0 ? ',' : '') + '"' + module.id + '"';
			});

			source += "]);\n\n";
		}

		if (_options.globalModules) {
			source += "\tglobals = " + JSON.stringify(_options.globalModules) + ";\n\n";
		}

		// Generate source version
		modules.forEach(function(module) {
			if (fs.existsSync(module.filePath)) {
				source += "\tload('" + utils.toUnixPath(path.relative(path.dirname(_options.outputDev), module.filePath)) + "');\n";
			} else if (module.source) {
				source += "\thtml += '<script type=\"text/javascript\">" + module.source.replace(/([\\\'\^])/g, "\\$1").replace(/([\n]+)/g, '\\n').replace(/([\t]+)/g, '\\t') + "</script>';\n";
				source += '\tmoduleCount++;\n';
			}
		});

		var inlineLoaderSrc = utils.getFileContents(path.join(__dirname, "AmdDevLoader.js"));
		inlineLoaderSrc = inlineLoaderSrc.replace(/\$fileName/g, function() {
			return path.basename(_options.outputDev);
		});

		source += "\n\twriteScripts();";
		source = inlineLoaderSrc.replace(/\s*\$code\(\);/g, function() {
			return "\n\n\t" + source.trim();
		});

		if (_options.hash) {
			source += '\n\n// $hash: ' + _options.hash;
		}

		currentReporter.info("Writing development version to: " + utils.toUnixPath(_options.outputDev));

		fs.writeFileSync(utils.createDirForFile(_options.outputDev), source);
	}
}


function compileCoverage(modules) {
	compileSource(modules, true);
}


function generateHash(modules, options) {
	var hashData = '';

	modules.forEach(function(module) {
		hashData += module.filePath;
		hashData += utils.getFileModTime(module.filePath);
	});

	hashData += JSON.stringify(options);

	return crypto.createHash('md5').update(hashData).digest("hex");
}


function parseHash(scriptFile) {
	if (fs.existsSync(scriptFile)) {
		var matches = /\$hash: ([a-z0-9]+)$/.exec(utils.getFileContents(scriptFile));

		if (matches) {
			return matches[1];
		}
	}
}

/**
 * Compile functions to be used by build scripts/cli.
 *
 * Usage:
 *  AmdCompiler.compile({
 *     from: "js/namespace/Class.js",
 *     baseDir: "js",
 *     outputSource: "mylib.js",
 *     outputMinified: "mylib.min.js",
 *     outputDev: "mylib.dev.js"
 *  });
 */
function compile(options) {
	var modules, currentHash, previousHash;
	
	utils.extend(_options, options);

	utils.flushCache();

	if (_options.verbose) {
		_options.reporter = _options.reporter || {};
		_options.reporter.level = "info";
	}

	currentReporter = new reporter.create(_options.reporter);

	try {
		modules = parseModules();

		currentHash = _options.hash = generateHash(modules, _options);
		previousHash = parseHash(_options.outputDev);

		if (_options.force || currentHash != previousHash) {
			if (_options.outputMinified) {
				compileMinified(modules);
			}
			
			if (_options.outputSource) {
				compileSource(modules);
			}
			
			if (_options.outputDev) {
				compileDevelopment(modules);
			}
			
			if (_options.outputCoverage) {
				compileCoverage(modules);
			}
		}
	} catch (ex) {
		currentReporter.fatal(ex);
	}
}


exports.compile = compile;
exports.parseModules = parseModules;
