/*jshint evil:true, unused:false */
/*global jake:true, require:true, module:true, process:true */

var fs = require("fs");
var Handlebars = require("handlebars");
var exec = require("child_process").exec;
var util = require("./utils");

var source = {
	toc: Handlebars.compile([
		'### Table of Contents\n',
		'{{#each classes}}',
			'* [[{{convertSlashesToDots .}}|{{convertSlashesToDots .}}]]\n',
		'{{/each}}',
	''].join('')),

	page: Handlebars.compile([
		'_**Important!** This page is auto-generated from the comments in the source files. All changes will be overwritten! If you are looking to contribute, modify the comment in the corresponding source file instead._\n\n',

		'### Module: _{{normalizedClassName}}_\n\n',

		'### Table of Contents\n',
		'{{#if notStatic}}',
			'* [Constructor](#Constructor-method)\n',
		'{{/if}}',
		'{{#if property}}',
			'* [Properties](#properties)\n',
			'{{#each property}}',
			'	* [{{name}}](#{{name}}-property) {{#if static}}`static`{{/if}} {{#if deprecated}}*(deprecated{{#if deprecationMessage}}: {{deprecationMessage}}{{/if}})*{{/if}}\n',
			'{{/each}}',
		'{{/if}}',
		'{{#if method}}',
			'* [Methods](#methods)\n',
			'{{#each method}}',
			'	* [{{name}}({{{formatSignature params}}})](#{{name}}-method{{formatAnchorSuffix params}}) {{#if static}}`static`{{/if}} {{#if deprecated}}*(deprecated{{#if deprecationMessage}}: {{deprecationMessage}}{{/if}})*{{/if}}\n',
			'{{/each}}',
		'{{/if}}',
		'{{#if event}}',
			'* [Events](#events)\n',
			'{{#each event}}',
			'	* [{{name}}](#{{name}}-event) {{#if deprecated}}*(deprecated{{#if deprecationMessage}}: {{deprecationMessage}}{{/if}})*{{/if}}\n',
			'{{/each}}',
		'{{/if}}\n',

		'{{{formatConstructor .}}}',

		'{{#if property}}',
			'## Properties\n\n',

			'{{#each property}}',
				'<a name="{{name}}-property" />\n\n',

				'### [{{name}}]({{srcUrl}} "Defined at: {{file}}:{{line}}") {{#if static}}`static`{{/if}}\n',
				'##### {{#if deprecated}}*(deprecated{{#if deprecationMessage}}: {{deprecationMessage}}{{/if}})*{{/if}}\n\n',

				'{{{description}}}\n\n',

				'{{#if example}}',
					'__Example__\n',
					'{{#each example}}',
					'{{formatExample .}}\n',
					'{{/each}}',
				'{{/if}}',
			'{{/each}}\n',
		'{{/if}}',

		'{{#if method}}',
			'## Methods\n\n',

			'{{#each method}}',
				'<a name="{{name}}-method{{formatAnchorSuffix params}}" />\n\n',

				'### [{{name}}({{{formatSignature params}}})]({{srcUrl}} "Defined at: {{file}}:{{line}}") {{#if static}}`static`{{/if}}\n',
				'##### {{#if deprecated}}*(deprecated{{#if deprecationMessage}}: {{deprecationMessage}}{{/if}})*{{/if}}\n\n',

				'{{> body}}',
			'{{/each}}\n',
		'{{/if}}',

		'{{#if event}}',
			'## Events\n',
			'{{#each event}}',
				'<a name="{{name}}-event" />\n\n',

				'### {{name}}\n',
				'##### {{#if deprecated}}*(deprecated{{#if deprecationMessage}}: {{deprecationMessage}}{{/if}})*{{/if}}\n\n',

				'{{> body}}',
			'{{/each}}\n',
		'{{/if}}',
	''].join('')),

	constructor: Handlebars.compile([
		'## Constructor\n',
		'<a name="Constructor-method" />\n\n',

		'### [{{shortName}}({{{formatSignature params}}})]({{srcUrl}} "Defined at: {{file}}:{{line}}") {{#if static}}`static`{{/if}}\n\n',
		'{{> body}}',
	''].join('')),

	body: Handlebars.compile([
		'{{{description}}}\n\n',

		'{{#if params}}',
			'__Arguments__\n\n',
			'{{#each params}}',
				'{{> argument}}',
			'{{/each}}\n',
		'{{/if}}',

		'{{#if example}}',
			'__Example__\n',
			'{{#each example}}',
			'{{{formatExample .}}}\n',
			'{{/each}}\n',
		'{{/if}}',
	''].join('')),

	argument: Handlebars.compile([
		'{{#if type}}',
			'* **{{#if optional}}',
				'{{#if optdefault}}',
					'[{{name}}={{{optdefault}}}]',
				'{{else}}',
					'[{{name}}]',
				'{{/if}}',
			'{{else}}',
				'{{name}}',
			'{{/if}}** `{{type}}`  \n',
			'{{{formatArgDescription .}}}\n',
			'{{#if props}}',
				'{{#each props}}',
					'{{indent level}}{{> argument}}',
				'{{/each}}',
			'{{/if}}',
		'{{/if}}',
	''].join(''))
};


function generatePages(githubRepo, dir, YUIDocDir) {
	var privateClasses = {};

	if (!fs.existsSync(dir) || !fs.existsSync(YUIDocDir + "/data.json")) {
		process.exit(1);
	}

	// clear previous versions
	var apiDir = dir + "/API";
	if (fs.existsSync(apiDir)) {
		jake.rmRf(apiDir);
	}
	fs.mkdirSync(apiDir, 0755);

	// load YUIDoc exported data
	var data = eval("("+fs.readFileSync(YUIDocDir + "/data.json").toString()+")");

	// parse the data and generate the pages
	var srcUrl = "/" + githubRepo.replace(/^[\s\S]+?github\.com[:\/]([\s\S]+?)\.wiki[\s\S]+$/, '$1') + "/blob/master/";

	var defineArgIndentation = function(args, level) {
		level = level || 0;
		util.each(args, function(arg) {
			arg.level = level;
			if (arg.props) {
				defineArgIndentation(arg.props, level + 1);
			}
		});
	};


	util.each(data.classes, function(item, className) {
		if (item.access && item.access != 'public') {
			privateClasses[className] = item;
			delete data.classes[className];
		}
	});

	// prepare class items...
	util.each(data.classitems, function(item) {
		if (!data.classes[item.class]) { // class striped off as not required
			return true;
		}

		if (item.access && item.access != 'public' || privateClasses[item.class]) {
			return true;
		}

		if (!~['method', 'property', 'event'].indexOf(item.itemtype)) {
			return true;
		}

		if (util.isArray(data.classes[item.class].classitems)) {
			data.classes[item.class].classitems = {
				property: [],
				method: [],
				event: []
			};
		}

		// define a link to an item's place in a source
		item.srcUrl = srcUrl + item.file + '#L' + item.line;

		// come up with argument indentation level
		if (typeof data.classes[item.class].level == 'undefined' && data.classes[item.class].params) {
			defineArgIndentation(data.classes[item.class].params);
		}

		if (['method', 'event'].indexOf(item.itemtype) !== -1 && item.params) {
			defineArgIndentation(item.params);
		}

		data.classes[item.class].classitems[item.itemtype].push(item);
	});


	// define Handlebars helpers
	Handlebars.registerHelper('formatConstructor', function(item) {
		var fn = data.classes[item.class];

		if (fn.is_constructor != 1) {
			return '';
		}

		fn.srcUrl = srcUrl + fn.file + '#L' + fn.line;
		fn.shortName = fn.name.replace(/^.*?([^\/]+)$/, '$1');
		return source.constructor(fn);
	});


	Handlebars.registerHelper('formatSignature', function(params) {
		var titleArgs = [];
		util.each(params, function(param) {
			var name;
			if (param.type) {
				if (param.optional) {
					name = param.optdefault ? "[" + param.name + "=" + param.optdefault + "]" : "[" + param.name + "]";
				} else {
					name = param.name;
				}
				titleArgs.push(name);
			}
		});
		return titleArgs.join(", ");
	});


	Handlebars.registerHelper('formatAnchorSuffix', function(params) {
		var suffix = Handlebars.helpers.formatSignature(params).replace(/\W+/g, '');
		if (suffix) {
			suffix = '-' + suffix;
		}
		return suffix;
	});


	Handlebars.registerHelper('formatExample', function(example) {
		var type = /<\w+>/.test(example) ? 'html' : 'javascript';
		return "```" + type + "\n" + example.replace(/^\xA0+/, '') + "\n```\n";
	});


	Handlebars.registerHelper('formatArgDescription', function(arg) {
		var indent = Handlebars.helpers.indent(arg.level);
		var description = arg.description.replace(/(```[^`]+```)/g, function($0, $1) {
			return $1.replace(/\n/g, '\n' + indent);
		});
		return indent + description.replace(/\n\n/g, '\n\n' + indent);
	});


	Handlebars.registerHelper('formatType', function(type) {
		return type.replace(/\|/g, '\\');
	});


	Handlebars.registerHelper('convertSlashesToDots', function(str) {
		return str.replace(/\//g, '.');
	});

	Handlebars.registerHelper('convertSlashesToDashes', function(str) {
		return str.replace(/\//g, '-');
	});


	Handlebars.registerHelper('indent', function(level) {
		var indent = '';
		while (level--) {
			indent += '\t';
		}
		return indent;
	});


	// define partials
	Handlebars.registerPartial('argument', source.argument);
	Handlebars.registerPartial('body', source.body);


	// generate TOC
	fs.writeFileSync(apiDir + "/" + "API.md", source.toc({
		classes: Object.keys(data.classes)
	}));


	// generate pages
	util.each(data.classes, function(item, className) {
		fs.writeFileSync(apiDir + "/" + className.replace(/\//g, '.') + ".md", source.page({
			class: className,
			normalizedClassName: className.replace(/\//g, '.'),
			notStatic: item.static !== 1,
			property: item.classitems.property,
			method: item.classitems.method,
			event: item.classitems.event
		}));
	});
}


module.exports = function(githubRepo, dir, YUIDocDir) {
	var self = this, args = [].slice.call(arguments);
	// make sure we have the repo
	if (!fs.existsSync(dir)) {
		var cmd = "git clone " + githubRepo + " ./" + dir;
		console.info(cmd);
		exec(cmd, function(err, stdout, stderr) {
			if (!err) {
				generatePages.apply(self, args);
			} else {
				console.error(stderr);
			}
		});
	} else {
		generatePages.apply(self, args);
	}
};
