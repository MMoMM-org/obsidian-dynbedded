/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MyPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/SampleCommands.ts
var import_obsidian2 = require("obsidian");

// src/SampleModal.ts
var import_obsidian = require("obsidian");
var SampleModal = class extends import_obsidian.Modal {
  constructor(app2) {
    super(app2);
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.setText("Woah!");
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// src/SampleCommands.ts
var SampleCommands = class {
  constructor(plugin) {
    this.plugin = plugin;
    plugin.log("Loading Commands");
    this.registerCommands();
  }
  registerCommands() {
    this.plugin.addCommand({
      id: "open-sample-modal-simple",
      name: "Open sample modal (simple)",
      callback: () => {
        new SampleModal(app).open();
      }
    });
    this.plugin.addCommand({
      id: "sample-editor-command",
      name: "Sample editor command",
      editorCallback: (editor, view) => {
        console.log(editor.getSelection());
        editor.replaceSelection("Sample Editor Command");
      }
    });
    this.plugin.addCommand({
      id: "open-sample-modal-complex",
      name: "Open sample modal (complex)",
      checkCallback: (checking) => {
        const markdownView = app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
        if (markdownView) {
          if (!checking) {
            new SampleModal(app).open();
          }
          return true;
        }
      }
    });
  }
};

// src/SampleSettingTab.ts
var import_obsidian3 = require("obsidian");
var DEFAULT_SETTINGS = {
  debugLogging: false,
  mySetting: "default"
};
var SampleSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app2, plugin) {
    super(app2, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h1", { text: this.plugin.pluginName });
    containerEl.createEl("b", { text: " Version: " + this.plugin.pluginVersion });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("a", { text: "Created by " + this.plugin.pluginAuthor, href: this.plugin.pluginAuthorUrl });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("a", { text: "Plugin Documentation", href: this.plugin.pluginDocumentationUrl });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("h3", { text: "Configuration:" });
    new import_obsidian3.Setting(containerEl).setName("Setting #1").setDesc("It's a secret").addText((text) => text.setPlaceholder("Enter your secret").setValue(this.plugin.settings.mySetting).onChange(async (value) => {
      this.plugin.log("Secret: " + value);
      this.plugin.settings.mySetting = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Developer Settings" });
    new import_obsidian3.Setting(containerEl).setName("Enable Debug Logging").setDesc("If this is enabled, more things are printed to the console.").addToggle((toggle) => toggle.setValue(this.plugin.settings.debugLogging).onChange(async (value) => {
      this.plugin.log("Debug Logging", value);
      this.plugin.settings.debugLogging = value;
      await this.plugin.saveSettings();
    }));
  }
};

// src/main.ts
var MyPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.pluginName = this.manifest.name;
    this.pluginVersion = this.manifest.version;
    this.pluginAuthor = this.manifest.author;
    this.pluginAuthorUrl = this.manifest.authorUrl;
    this.pluginDocumentationUrl = "https://github.com/MMoMM-Marcus/obsidian-plugin-base";
  }
  async onload() {
    await this.loadSettings();
    this.log("Loading Plugin");
    const ribbonIconEl = this.addRibbonIcon("dice", "Sample Plugin", (evt) => {
      new import_obsidian4.Notice("This is a notice!");
    });
    ribbonIconEl.addClass("my-plugin-ribbon-class");
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText("Status Bar Text");
    new SampleCommands(this);
    this.addSettingTab(new SampleSettingTab(this.app, this));
    this.registerDomEvent(document, "click", (evt) => {
      this.log("click", evt);
    });
    this.registerInterval(window.setInterval(() => this.log("setInterval"), 5 * 60 * 1e3));
  }
  onunload() {
    this.log("Unloading Plugin");
  }
  log(...args) {
    if (this.settings.debugLogging) {
      console.log(this.pluginName + " Debug:", ...args);
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.log("Settings loaded", this.settings);
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.log("Settings saved", this.settings);
  }
};