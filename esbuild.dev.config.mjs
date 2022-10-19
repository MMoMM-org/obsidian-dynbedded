import esbuild from "esbuild";
import process from "process";
import builtins from 'builtin-modules'
import { copy }  from "esbuild-plugin-copy";



// Change the following values
const TEST_VAULT = 'test-vault';
const PLUGIN_ID = 'obsidian-plugin-base';

// Taken and adapted from https://github.com/MSzturc/obsidian-advanced-slides/blob/main/esbuild.config.mjs
const staticAssetsPlugin = {
	name: 'static-assets-plugin',
	setup(build) {
		build.onLoad({ filter: /.+/ }, (args) => {
			return {
				watchFiles: ['styles.css', 'esbuild.dev.config.mjs', 'manifest.json'],
			};
		});
	},
};


// You can normally ignore everything from here


const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = (process.argv[2] === 'production');
const PLUGINS_PATH = '/.obsidian/plugins/';


esbuild.build({
	banner: {
		js: banner,
	},
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtins],
	format: 'cjs',
	minify: prod,
	watch: !prod,
	target: 'es2020',
	logLevel: "info",
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: TEST_VAULT + PLUGINS_PATH + PLUGIN_ID +'/main.js',
	plugins: [
		staticAssetsPlugin,
		copy({
			assets: {
				from: ['./styles.css', './manifest.json'],
				to: ['.'],
			},
		}),
	],
}).catch(() => process.exit(1));