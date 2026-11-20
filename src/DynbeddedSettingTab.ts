import { App, Notice, PluginSettingTab, requireApiVersion, Setting, SettingDefinitionItem, TextComponent } from 'obsidian';
import Dynbedded from './main';


export type DisplayMode = 'embedded' | 'inline';

export interface DynbeddedSettings {
	debugLogging: boolean;
	silentMode: boolean;
	autoRefresh: boolean;
	refreshIntervalSeconds: number;
	defaultDisplay: DisplayMode;
	renderQuothBlocks: boolean;
	quoteStyle: boolean;
	showSourceLink: boolean;
	includeHeading: boolean;
}

type SettingKey = keyof DynbeddedSettings;

export const DEFAULT_SETTINGS: DynbeddedSettings = {
	debugLogging: false,
	silentMode: false,
	autoRefresh: false,
	refreshIntervalSeconds: 60,
	defaultDisplay: 'embedded',
	renderQuothBlocks: false,
	quoteStyle: false,
	showSourceLink: false,
	includeHeading: false,
};

const REFRESH_INTERVAL_MIN = 10;
const REFRESH_INTERVAL_MAX = 3600;

// Shared by the declarative (Obsidian 1.13+) and the imperative (older Obsidian) render paths.
const TEXT = {
	silentModeName: 'Enable silent mode',
	silentModeDesc: 'When enabled, missing files or headers render as empty blocks instead of showing an error message.',
	defaultDisplayName: 'Default display mode',
	defaultDisplayDesc: 'How blocks render when they do not set "display:". Embedded keeps block formatting; inline drops the surrounding paragraph so the content flows in one run.',
	quoteStyleName: 'Quote styling',
	quoteStyleDesc: 'Show embedded (block) content with a coloured left accent and a slight indent, like a quote. Applies to embedded display only.',
	showSourceLinkName: 'Show source link',
	showSourceLinkDesc: 'Add a small link icon to each embed that opens the original note.',
	includeHeadingName: 'Include heading in section',
	includeHeadingDesc: 'When embedding a "#heading" section, also render the heading line itself. Off keeps the original behaviour of starting below the heading. Does not affect "after:" ranges.',
	autoRefreshName: 'Enable auto-refresh',
	autoRefreshDesc: 'Automatically re-render dynbedded blocks at a set interval. Changes take effect when the note is reopened.',
	intervalName: 'Refresh interval (seconds)',
	intervalDescEnabled: `How often to re-render dynbedded blocks (${REFRESH_INTERVAL_MIN}–${REFRESH_INTERVAL_MAX} seconds).`,
	intervalDescDisabled: `Enable Auto-Refresh above to change this value (${REFRESH_INTERVAL_MIN}–${REFRESH_INTERVAL_MAX} seconds).`,
	intervalInvalid: `Enter a whole number between ${REFRESH_INTERVAL_MIN} and ${REFRESH_INTERVAL_MAX}.`,
	renderQuothName: 'Render quoth blocks',
	renderQuothDesc: 'Also render code blocks written for the deprecated Quoth plugin. '
		+ 'Reload Obsidian after changing this, and uninstall Quoth first so the two plugins '
		+ 'do not both claim the "quoth" code block.',
	renderQuothNotice: 'Dynbedded: reload Obsidian for the quoth setting to take effect.',
	debugLoggingName: 'Enable debug logging',
	debugLoggingDesc: 'If this is enabled, more things are printed to the console.',
	headingEmbedding: 'Embedding',
	headingQuoth: 'Quoth compatibility',
	headingLogging: 'Logging',
};

// Code-block-key → label used in the debug log, matching the imperative path's log lines.
const LOG_LABELS: Record<SettingKey, string> = {
	debugLogging: 'Debug Logging',
	silentMode: 'Silent Mode',
	autoRefresh: 'Auto Refresh',
	refreshIntervalSeconds: 'Refresh Interval',
	defaultDisplay: 'Default Display',
	renderQuothBlocks: 'Render Quoth Blocks',
	quoteStyle: 'Quote Style',
	showSourceLink: 'Show Source Link',
	includeHeading: 'Include Heading',
};


export class DynbeddedSettingTab extends PluginSettingTab {
	private plugin: Dynbedded;

	constructor(app: App, plugin: Dynbedded) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Base description plus a "per-block override" note that renders the
	// code-block key as <code> so it reads as an identifier, not prose.
	private describeWithOverride(base: string, key: string): DocumentFragment {
		return createFragment(frag => {
			frag.appendText(base + ' A block can override this with ');
			frag.createEl('code', { text: key + ': true' });
			frag.appendText(' or ');
			frag.createEl('code', { text: key + ': false' });
			frag.appendText('.');
		});
	}

	private renderBanner(containerEl: HTMLElement): void {
		const banner = containerEl.createDiv({ cls: 'dynbedded-settings-banner' });
		banner.createDiv({ cls: 'dynbedded-settings-banner-title', text: this.plugin.pluginName });
		banner.createDiv({ cls: 'dynbedded-settings-banner-subtitle', text: this.plugin.pluginDescription });
		banner.createDiv({ cls: 'dynbedded-settings-banner-version', text: 'Version: ' + this.plugin.pluginVersion });
		banner.createEl('a', {
			cls: 'dynbedded-settings-banner-link',
			text: 'Created by ' + this.plugin.pluginAuthor,
			href: this.plugin.pluginAuthorUrl,
		});
		banner.createEl('a', {
			cls: 'dynbedded-settings-banner-link',
			text: 'Plugin documentation',
			href: this.plugin.pluginDocumentationUrl,
		});

		// take from https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/04367bd3cd96a162185401139995f7fc48481470/src/settings.ts#L261
		const coffeeDiv = containerEl.createDiv("coffee");
		coffeeDiv.addClass("ex-coffee-div");
		const coffeeLink = coffeeDiv.createEl("a", {
			href: "https://ko-fi.com/mmomm",
		});
		const coffeeImg = coffeeLink.createEl("img", {
			attr: {
				src: "https://cdn.ko-fi.com/cdn/kofi3.png?v=3",
			},
		});
		coffeeImg.height = 45;
	}

	/**
	 * Declarative settings (Obsidian 1.13+): rendered by Obsidian and indexed
	 * by the global settings search. Older Obsidian versions ignore this and
	 * call display() instead.
	 */
	getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
		return [
			{
				name: this.plugin.pluginName,
				searchable: false,
				render: setting => {
					setting.settingEl.empty();
					this.renderBanner(setting.settingEl);
				},
			},
			{
				type: 'group',
				heading: TEXT.headingEmbedding,
				items: [
					{
						name: TEXT.silentModeName,
						desc: TEXT.silentModeDesc,
						aliases: ['errors', 'hide errors'],
						control: { type: 'toggle', key: 'silentMode', defaultValue: DEFAULT_SETTINGS.silentMode },
					},
					{
						name: TEXT.defaultDisplayName,
						desc: TEXT.defaultDisplayDesc,
						aliases: ['inline', 'embedded'],
						control: {
							type: 'dropdown',
							key: 'defaultDisplay',
							defaultValue: DEFAULT_SETTINGS.defaultDisplay,
							options: { embedded: 'Embedded (block)', inline: 'Inline' },
						},
					},
					{
						name: TEXT.quoteStyleName,
						desc: this.describeWithOverride(TEXT.quoteStyleDesc, 'quoteStyle'),
						control: { type: 'toggle', key: 'quoteStyle', defaultValue: DEFAULT_SETTINGS.quoteStyle },
					},
					{
						name: TEXT.showSourceLinkName,
						desc: this.describeWithOverride(TEXT.showSourceLinkDesc, 'showSourceLink'),
						control: { type: 'toggle', key: 'showSourceLink', defaultValue: DEFAULT_SETTINGS.showSourceLink },
					},
					{
						name: TEXT.includeHeadingName,
						desc: this.describeWithOverride(TEXT.includeHeadingDesc, 'includeHeading'),
						control: { type: 'toggle', key: 'includeHeading', defaultValue: DEFAULT_SETTINGS.includeHeading },
					},
					{
						name: TEXT.autoRefreshName,
						desc: TEXT.autoRefreshDesc,
						control: { type: 'toggle', key: 'autoRefresh', defaultValue: DEFAULT_SETTINGS.autoRefresh },
					},
					{
						name: TEXT.intervalName,
						desc: TEXT.intervalDescEnabled,
						control: {
							type: 'number',
							key: 'refreshIntervalSeconds',
							defaultValue: DEFAULT_SETTINGS.refreshIntervalSeconds,
							min: REFRESH_INTERVAL_MIN,
							max: REFRESH_INTERVAL_MAX,
							step: 1,
							disabled: () => !this.plugin.settings.autoRefresh,
							validate: value => isValidInterval(value) ? undefined : TEXT.intervalInvalid,
						},
					},
				],
			},
			{
				type: 'group',
				heading: TEXT.headingQuoth,
				items: [
					{
						name: TEXT.renderQuothName,
						desc: TEXT.renderQuothDesc,
						control: { type: 'toggle', key: 'renderQuothBlocks', defaultValue: DEFAULT_SETTINGS.renderQuothBlocks },
					},
				],
			},
			{
				type: 'group',
				heading: TEXT.headingLogging,
				items: [
					{
						name: TEXT.debugLoggingName,
						desc: TEXT.debugLoggingDesc,
						control: { type: 'toggle', key: 'debugLogging', defaultValue: DEFAULT_SETTINGS.debugLogging },
					},
				],
			},
		];
	}

	// Persist through the plugin's saveSettings() and keep the side effects of the imperative path.
	async setControlValue(key: string, value: unknown): Promise<void> {
		const settingKey = key as SettingKey;
		this.plugin.log(LOG_LABELS[settingKey] ?? key, value);
		(this.plugin.settings as unknown as Record<string, unknown>)[settingKey] = value;
		await this.plugin.saveSettings();

		if (settingKey === 'autoRefresh') {
			// Re-evaluates the interval's `disabled` predicate. Only the declarative
			// path (1.13+) calls setControlValue; the guard makes that explicit.
			if (requireApiVersion('1.13.0')) {
				this.refreshDomState();
			}
		} else if (settingKey === 'renderQuothBlocks') {
			new Notice(TEXT.renderQuothNotice);
		}
	}

	/**
	 * Imperative fallback for Obsidian < 1.13, which does not know
	 * getSettingDefinitions(). Newer versions never call this.
	 */
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.renderBanner(containerEl);

		new Setting(containerEl).setName(TEXT.headingEmbedding).setHeading();

		new Setting(containerEl)
			.setName(TEXT.silentModeName)
			.setDesc(TEXT.silentModeDesc)
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.silentMode).onChange(async value => {
					this.plugin.log("Silent Mode", value)
					this.plugin.settings.silentMode = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(TEXT.defaultDisplayName)
			.setDesc(TEXT.defaultDisplayDesc)
			.addDropdown(dropdown =>
				dropdown
					.addOption('embedded', 'Embedded (block)')
					.addOption('inline', 'Inline')
					.setValue(this.plugin.settings.defaultDisplay)
					.onChange(async value => {
						this.plugin.log("Default Display", value);
						this.plugin.settings.defaultDisplay = value as DisplayMode;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(TEXT.quoteStyleName)
			.setDesc(this.describeWithOverride(TEXT.quoteStyleDesc, 'quoteStyle'))
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.quoteStyle).onChange(async value => {
					this.plugin.log("Quote Style", value);
					this.plugin.settings.quoteStyle = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(TEXT.showSourceLinkName)
			.setDesc(this.describeWithOverride(TEXT.showSourceLinkDesc, 'showSourceLink'))
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.showSourceLink).onChange(async value => {
					this.plugin.log("Show Source Link", value);
					this.plugin.settings.showSourceLink = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(TEXT.includeHeadingName)
			.setDesc(this.describeWithOverride(TEXT.includeHeadingDesc, 'includeHeading'))
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.includeHeading).onChange(async value => {
					this.plugin.log("Include Heading", value);
					this.plugin.settings.includeHeading = value;
					await this.plugin.saveSettings();
				})
			);

		let intervalSetting: Setting;
		let intervalText: TextComponent;

		const applyIntervalDisabled = (disabled: boolean) => {
			intervalText.setDisabled(disabled);
			intervalSetting.setDisabled(disabled);
			intervalSetting.setDesc(disabled ? TEXT.intervalDescDisabled : TEXT.intervalDescEnabled);
			intervalText.inputEl.toggleClass('dynbedded-disabled-input', disabled);
		};

		new Setting(containerEl)
			.setName(TEXT.autoRefreshName)
			.setDesc(TEXT.autoRefreshDesc)
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.autoRefresh).onChange(async value => {
					this.plugin.log("Auto Refresh", value);
					this.plugin.settings.autoRefresh = value;
					await this.plugin.saveSettings();
					applyIntervalDisabled(!value);
				})
			);

		intervalSetting = new Setting(containerEl)
			.setName(TEXT.intervalName)
			.addText(text => {
				intervalText = text;
				text.setValue(String(this.plugin.settings.refreshIntervalSeconds));
				const persistInterval = async () => {
					const parsed = parseInt(text.getValue(), 10);
					const clamped = isNaN(parsed) ? this.plugin.settings.refreshIntervalSeconds
					                              : Math.max(REFRESH_INTERVAL_MIN, Math.min(REFRESH_INTERVAL_MAX, parsed));
					this.plugin.settings.refreshIntervalSeconds = clamped;
					await this.plugin.saveSettings();
					text.setValue(String(clamped));
				};
				// Save and clamp only when the user leaves the field
				text.inputEl.addEventListener('blur', () => { void persistInterval(); });
			});
		applyIntervalDisabled(!this.plugin.settings.autoRefresh);

		new Setting(containerEl).setName(TEXT.headingQuoth).setHeading();

		new Setting(containerEl)
			.setName(TEXT.renderQuothName)
			.setDesc(TEXT.renderQuothDesc)
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.renderQuothBlocks).onChange(async value => {
					this.plugin.log("Render Quoth Blocks", value);
					this.plugin.settings.renderQuothBlocks = value;
					await this.plugin.saveSettings();
					new Notice(TEXT.renderQuothNotice);
				})
			);

// Leave this alone!
		containerEl.createEl('hr');
		new Setting(containerEl).setName(TEXT.headingLogging).setHeading();

		new Setting(containerEl)
			.setName(TEXT.debugLoggingName)
			.setDesc(TEXT.debugLoggingDesc)
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.debugLogging).onChange(async value => {
					this.plugin.log("Debug Logging", value)
					this.plugin.settings.debugLogging = value;
					await this.plugin.saveSettings();
				})
			);
	}
}

function isValidInterval(value: number): boolean {
	return Number.isInteger(value) && value >= REFRESH_INTERVAL_MIN && value <= REFRESH_INTERVAL_MAX;
}


