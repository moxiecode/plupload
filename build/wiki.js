var fs = require("fs");
var utils = require("./utils");

var wiki = function(githubRepo, dir, YUIDocDir) {

	function parseYUIDoc() {
		var types = {
			method: "## Methods\n\n",
			property: "## Properties\n\n",
			event: "## Events\n\n"
		};

		var formatArguments = function(args, level) {
			var result = !level ? "\n__Arguments__\n\n" : "";
			
			level = level || 0;

			utils.each(args, function(param) {
				var name;
				if (param.type) {
					if (param.optional) {
						name = param.optdefault ? "[" + param.name + "=" + param.optdefault + "]" : "[" + param.name + "]";
					} else {
						name = param.name;
					}
					// indent level times
					for (var i = 0; i < level; i++) {
						result += "\t";
					}
					// put it together finally
					result += "* **" + name + "** _(" + param.type.replace(/\|/g, '/') + ")_ " + param.description + "\n";

					// if param has sub-properties
					if (param.props) {
						result += formatArguments(param.props, level + 1);
					}
				}
			});
			return result;
		};


		var formatItem = function(item) {
			var delimiter = '\n---------------------------------------\n\n'
			, codeUrl = "/" + githubRepo.replace(/^[\s\S]+?github\.com[:\/]([\s\S]+?)\.wiki[\s\S]+$/, '$1') + "/blob/master/"
			, title = item.is_constructor ? '# '+item.name : '<a name="'+item.name+'" />\n### '+item.name
			, line = '_Defined at: ['+item.file+':'+item.line+']('+codeUrl+item.file+'#L'+item.line+')_\n\n\n'
			, description = item.description + "\n"
			;

			// add arguments listing if item is method
			if (('method' === item.itemtype || item.is_constructor) && item.params) {
				var titleArgs = [];
				var args = "\n__Arguments__\n\n";
				utils.each(item.params, function(param) {
					var name;
					if (param.type) {
						if (param.optional) {
							name = param.optdefault ? "[" + param.name + "=" + param.optdefault + "]" : "[" + param.name + "]";
						} else {
							name = param.name;
						}
						titleArgs.push(name);
						args += "* **" + name + "** _(" + param.type.replace(/\|/g, '/') + ")_ " + param.description + "\n";

						// append sub-properties if any
						if (param.props) {
							args += formatArguments(param.props, 1);
						}
					}
				});
				// add arguments
				title += "(" + (titleArgs.length ? titleArgs.join(", ") : "") + ")";
				description += args;
			}

			// add example
			if (item.example) {
				description += "\n__Examples__\n\n"
				utils.each(item.example, function(example) {
					var type = /<\w+>/.test(example) ? 'html' : 'javascript';
					description += "```" + type + example.replace(/^\xA0+/, '') + "\n```\n";
				});
			}

			return title + "\n" + line + description + (!item.is_constructor ? delimiter : '\n');
		};

		if (!fs.existsSync(dir) || !fs.existsSync(YUIDocDir + "/data.json")) {
			console.info(YUIDocDir + "/data.json cannot be found.");
			process.exit(1);
		}	

		var data = fs.readFileSync(YUIDocDir + "/data.json").toString();
		if (data == '') {
			console.info(YUIDocDir + "/data.json seems to be empty.");
			process.exit(1);
		}

		// read YUIDoc exported data in json
		data = eval("("+data+")");

		// Clear previous versions
		var apiDir = dir + "/API";
		if (fs.existsSync(apiDir)) {
			jake.rmRf(apiDir);
		}
		fs.mkdirSync(apiDir, 0755);


		// generate TOC page
		var toc = '## Table of Contents\n\n';
		utils.each(data.classes, function(item) {
			if (!item.access || item.access == 'public') {
				toc += "* [[" + item.name + "|" + item.name + "]]\n";
			}
		});
		fs.writeFileSync(apiDir + "/" + "API.md", toc);

		// generate pages
		var pages = {};		
		utils.each(data.classitems, function(item) {
			var className, page;

			// bypass private and protected
			if (item.access && item.access != 'public') {
				return true;
			}

			if (!~['method', 'property', 'event'].indexOf(item.itemtype)) {
				return true;
			}

			className = item.class;

			if (!pages[className]) {
				pages[className] = utils.extend({}, data.classes[className], {
					toc: {
						property: "",
						method: "",
						event: ""
					},
					content: {
						property: "",
						method: "",
						event: ""
					}
				});
			}
			page = pages[className];

			// put a link in the TOC
			page.toc[item.itemtype] += "* [%name%](#%name%)".replace(/%name%/g, item.name) + "\n";

			page.content[item.itemtype] += formatItem(item);
		});

		utils.each(pages, function(page, name) {
			var toc = "", body = "", header = "";

			header += formatItem(page);

			utils.each(["property", "method", "event"], function(type) {
				if (page.toc[type] != "") {
					toc += types[type] + page.toc[type] + "\n";
				}

				if (page.content[type] != "") {
					body += types[type] + page.content[type] + "\n";
				}
			});

			fs.writeFileSync(apiDir + "/" + name + ".md", header + toc + body);
		});
	}

	if (!fs.existsSync(dir)) {
		exec("git clone " + githubRepo + " ./" + dir, function(error, stdout, stderr) {
			parseYUIDoc();
		});
	} else {
		parseYUIDoc();
	}
};

module.exports = wiki;