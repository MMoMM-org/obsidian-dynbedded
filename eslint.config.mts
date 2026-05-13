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
