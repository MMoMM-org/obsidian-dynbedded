import { globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.mts", "manifest.json"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			// "Dynbedded" and "Quoth" are proper nouns (plugin names); the review
			// process disallows eslint-disable comments for this rule, so they're
			// registered via the rule's own ignoreWords option instead.
			"obsidianmd/ui/sentence-case": ["error", { enforceCamelCaseLower: true, ignoreWords: ["Dynbedded", "Quoth"] }],
		},
	},
	globalIgnores([
		"node_modules",
		"build",
		"Dynbedded",
		"claude-docker",
		"claude-docker-home",
		".claude",
		"docs",
		"esbuild.config.mjs",
		"update-vault.mjs",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"src/main.js",
	]),
);
