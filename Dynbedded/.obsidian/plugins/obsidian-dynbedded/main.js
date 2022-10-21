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
  default: () => Dynbedded
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/DynbeddedSettingTab.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  debugLogging: false
};
var DynbeddedSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h1", { text: this.plugin.pluginName });
    containerEl.createEl("h2", { text: this.plugin.pluginDescription });
    containerEl.createEl("b", { text: " Version: " + this.plugin.pluginVersion });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("a", { text: "Created by " + this.plugin.pluginAuthor, href: this.plugin.pluginAuthorUrl });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("a", { text: "Plugin Documentation", href: this.plugin.pluginDocumentationUrl });
    containerEl.createEl("br", { text: "" });
    containerEl.createEl("br", { text: "" });
    const coffeeDiv = containerEl.createDiv("coffee");
    coffeeDiv.addClass("ex-coffee-div");
    const coffeeLink = coffeeDiv.createEl("a", {
      href: "https://ko-fi.com/mmomm"
    });
    const coffeeImg = coffeeLink.createEl("img", {
      attr: {
        src: "https://cdn.ko-fi.com/cdn/kofi3.png?v=3"
      }
    });
    coffeeImg.height = 45;
    containerEl.createEl("h3", { text: "Developer Settings" });
    new import_obsidian.Setting(containerEl).setName("Enable Debug Logging").setDesc("If this is enabled, more things are printed to the console.").addToggle((toggle) => toggle.setValue(this.plugin.settings.debugLogging).onChange(async (value) => {
      this.plugin.log("Debug Logging", value);
      this.plugin.settings.debugLogging = value;
      await this.plugin.saveSettings();
    }));
  }
};

// src/main.ts
var _Dynbedded = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.pluginName = this.manifest.name;
    this.pluginDescription = this.manifest.description;
    this.pluginVersion = this.manifest.version;
    this.pluginAuthor = this.manifest.author;
    this.pluginAuthorUrl = this.manifest.authorUrl;
    this.pluginDocumentationUrl = "https://github.com/MMoMM-Marcus/obsidian-dynbedded";
  }
  async onload() {
    await this.loadSettings();
    this.log("Loading Plugin");
    this.addSettingTab(new DynbeddedSettingTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor(_Dynbedded.codeBlockKeyword, async (source, el, ctx) => {
      const fileNameMatchPattern = /\[\[([^\]]{2}.*)\]\]/u;
      const fileNameMatch = fileNameMatchPattern.exec(source);
      this.log("FileNameMatch", fileNameMatch);
      if (!fileNameMatch) {
        _Dynbedded.displayError(el, "Bad file link: " + source);
        return;
      }
      let fileName = fileNameMatch[1];
      const dynamicDateMatchPattern = /{{(.*)}}/;
      const dynamicDateMatch = dynamicDateMatchPattern.exec(fileName);
      this.log("DynamicDateMatch", dynamicDateMatch);
      if (dynamicDateMatch !== null) {
        let dynamicDateFormat = dynamicDateMatch[1];
        let duration = window.moment.duration(0);
        this.log("DynamicDateFormat", dynamicDateFormat.includes("|"));
        if (dynamicDateFormat.includes("|")) {
          const offset = dynamicDateFormat.split("|")[1];
          this.log("Offset", offset);
          dynamicDateFormat = dynamicDateFormat.split("|")[0];
          this.log("dynamicDateMatch", dynamicDateFormat);
          if (/^-?\d+$/.test(offset)) {
            this.log("Number");
            duration = window.moment.duration(Number(offset), "days");
          } else {
            this.log("String");
            duration = window.moment.duration(offset);
          }
          this.log("Duration", duration);
        }
        const dynamicDate = window.moment().add(duration).format(dynamicDateFormat);
        this.log("DynamicDate", dynamicDate);
        if (!window.moment(window.moment.now(), dynamicDateFormat, true).isValid || dynamicDate === null) {
          _Dynbedded.displayError(el, "Not a valid Moment.js Time format: " + dynamicDateFormat);
          return;
        }
        fileName = fileName.replace(dynamicDateMatchPattern, dynamicDate);
        this.log("DynamicFileName", fileName);
      }
      let header = "";
      if (fileName.contains("#")) {
        header = fileName.split("#")[1];
        fileName = fileName.split("#")[0];
        this.log("Header", header);
      }
      const matchingFile = this.app.metadataCache.getFirstLinkpathDest(fileName, "");
      this.log("MatchingFile", matchingFile);
      if (!matchingFile) {
        _Dynbedded.displayError(el, "File link not found: [[" + fileName + "]]");
        return;
      }
      if (matchingFile.extension !== "md") {
        _Dynbedded.displayError(el, "Bad file extension found, expected markdown: " + matchingFile);
        return;
      }
      let fileContents = "";
      if (header != "") {
        const headings = this.app.metadataCache.getFileCache(matchingFile).headings;
        if (headings === null || headings === void 0) {
          const errorMessage = 'Header "' + header + '" not found in [[' + fileName + "]]";
          _Dynbedded.displayError(el, errorMessage);
        }
        this.log("Headings", headings);
        let position;
        for (let i = 0; i < headings.length; i++) {
          const heading = headings[i];
          this.log("Heading", heading);
          if (heading.heading == header) {
            if (i == headings.length - 1) {
              position = [heading.position.start.line, -1];
            } else {
              position = [heading.position.start.line, headings[i + 1].position.start.line];
            }
          }
        }
        if (position) {
          let text = await this.app.vault.cachedRead(matchingFile);
          if (!text.endsWith("\n")) {
            text = text + "\n";
          }
          this.log("Position", position);
          this.log("Text", text);
          fileContents = text.split("\n").slice(position[0] + 1, position[1]).join("\n");
          this.log("Split", fileContents);
        }
      } else {
        fileContents = await this.app.vault.cachedRead(matchingFile);
      }
      if (fileContents == "") {
        const errorMessage = 'Header "' + header + '" not found in [[' + fileName + "]]";
        _Dynbedded.displayError(el, errorMessage);
        return;
      }
      this.log("File", fileContents);
      const container = el.createDiv({ cls: [_Dynbedded.containerClass] });
      await import_obsidian2.MarkdownRenderer.renderMarkdown(fileContents, container, ctx.sourcePath, this);
    });
  }
  onunload() {
    this.log("Unloading Plugin");
  }
  log(...args) {
    if (this.settings.debugLogging) {
      console.log(this.pluginName + "-Debug:", ...args);
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
var Dynbedded = _Dynbedded;
Dynbedded.codeBlockKeyword = "dynbedded";
Dynbedded.containerClass = "dynbedded";
Dynbedded.errorClass = "dynbedded-error";
Dynbedded.displayError = (parent, text) => {
  console.log("Dynbedded-Error: ", text);
  parent.createEl("pre", { text: "Dynbedded: Error: " + text, cls: [_Dynbedded.containerClass, _Dynbedded.errorClass] });
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc3JjL21haW4udHMiLCAiLi4vLi4vLi4vLi4vc3JjL0R5bmJlZGRlZFNldHRpbmdUYWIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7TWFya2Rvd25SZW5kZXJlciwgUGx1Z2lufSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQge0RFRkFVTFRfU0VUVElOR1MsIER5bmJlZGRlZFNldHRpbmdzLCBEeW5iZWRkZWRTZXR0aW5nVGFifSBmcm9tICcuL0R5bmJlZGRlZFNldHRpbmdUYWInO1xuXG50eXBlIExvZ1R5cGUgPSB0eXBlb2YgY29uc29sZS5sb2c7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHluYmVkZGVkIGV4dGVuZHMgUGx1Z2luIHtcblx0c2V0dGluZ3M6IER5bmJlZGRlZFNldHRpbmdzO1xuXHRwbHVnaW5OYW1lID0gdGhpcy5tYW5pZmVzdC5uYW1lO1xuXHRwbHVnaW5EZXNjcmlwdGlvbiA9IHRoaXMubWFuaWZlc3QuZGVzY3JpcHRpb247XG5cdHBsdWdpblZlcnNpb24gPSB0aGlzLm1hbmlmZXN0LnZlcnNpb247XG5cdHBsdWdpbkF1dGhvciA9IHRoaXMubWFuaWZlc3QuYXV0aG9yO1xuXHRwbHVnaW5BdXRob3JVcmwgPSB0aGlzLm1hbmlmZXN0LmF1dGhvclVybDtcblx0cGx1Z2luRG9jdW1lbnRhdGlvblVybCA9ICdodHRwczovL2dpdGh1Yi5jb20vTU1vTU0tTWFyY3VzL29ic2lkaWFuLWR5bmJlZGRlZCc7XG5cblx0c3RhdGljIGNvZGVCbG9ja0tleXdvcmQgPSBcImR5bmJlZGRlZFwiO1xuXHRzdGF0aWMgY29udGFpbmVyQ2xhc3MgPSBcImR5bmJlZGRlZFwiO1xuXHRzdGF0aWMgZXJyb3JDbGFzcyA9IFwiZHluYmVkZGVkLWVycm9yXCI7XG5cblx0c3RhdGljIGRpc3BsYXlFcnJvciA9IChwYXJlbnQ6IEhUTUxFbGVtZW50LCB0ZXh0OiBzdHJpbmcpID0+IHtcblx0XHRjb25zb2xlLmxvZyhcIkR5bmJlZGRlZC1FcnJvcjogXCIsdGV4dClcblx0XHRwYXJlbnQuY3JlYXRlRWwoXCJwcmVcIiwgeyB0ZXh0OiBcIkR5bmJlZGRlZDogRXJyb3I6IFwiICsgdGV4dCwgY2xzOiBbRHluYmVkZGVkLmNvbnRhaW5lckNsYXNzLCBEeW5iZWRkZWQuZXJyb3JDbGFzc10gfSk7XG5cdH1cblxuXG5cdGFzeW5jIG9ubG9hZCgpIHtcblx0XHRhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuXHRcdHRoaXMubG9nKFwiTG9hZGluZyBQbHVnaW5cIilcblxuXHRcdC8vIFRoaXMgYWRkcyBhIHNldHRpbmdzIHRhYiBzbyB0aGUgdXNlciBjYW4gY29uZmlndXJlIHZhcmlvdXMgYXNwZWN0cyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBEeW5iZWRkZWRTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cblx0XHQvLyBSZWdpc3RlcmluZyB0aGUgQ29kZUJsb2NrUHJvY2Vzc29yXG5cdFx0dGhpcy5yZWdpc3Rlck1hcmtkb3duQ29kZUJsb2NrUHJvY2Vzc29yKER5bmJlZGRlZC5jb2RlQmxvY2tLZXl3b3JkLCBhc3luYyAoc291cmNlLCBlbCwgY3R4KSA9PiB7XG5cdFx0XHRjb25zdCBmaWxlTmFtZU1hdGNoUGF0dGVybiA9IC9cXFtcXFsoW15cXF1dezJ9LiopXFxdXFxdL3U7XG5cdFx0XHRjb25zdCBmaWxlTmFtZU1hdGNoID0gZmlsZU5hbWVNYXRjaFBhdHRlcm4uZXhlYyhzb3VyY2UpO1xuXG5cdFx0XHR0aGlzLmxvZyhcIkZpbGVOYW1lTWF0Y2hcIiwgZmlsZU5hbWVNYXRjaCk7XG5cblx0XHRcdGlmICghZmlsZU5hbWVNYXRjaCkge1xuXHRcdFx0XHREeW5iZWRkZWQuZGlzcGxheUVycm9yKGVsLCBcIkJhZCBmaWxlIGxpbms6IFwiICsgc291cmNlKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bGV0IGZpbGVOYW1lID0gZmlsZU5hbWVNYXRjaFsxXTtcblxuXHRcdFx0Y29uc3QgZHluYW1pY0RhdGVNYXRjaFBhdHRlcm4gPSAve3soLiopfX0vO1xuXHRcdFx0Y29uc3QgZHluYW1pY0RhdGVNYXRjaCA9IGR5bmFtaWNEYXRlTWF0Y2hQYXR0ZXJuLmV4ZWMoZmlsZU5hbWUpO1xuXHRcdFx0dGhpcy5sb2coXCJEeW5hbWljRGF0ZU1hdGNoXCIsIGR5bmFtaWNEYXRlTWF0Y2gpO1xuXHRcdFx0aWYgKGR5bmFtaWNEYXRlTWF0Y2ggIT09IG51bGwpIHtcblx0XHRcdFx0bGV0IGR5bmFtaWNEYXRlRm9ybWF0ID0gZHluYW1pY0RhdGVNYXRjaFsxXTtcblx0XHRcdFx0bGV0IGR1cmF0aW9uID0gd2luZG93Lm1vbWVudC5kdXJhdGlvbigwKTtcblx0XHRcdFx0dGhpcy5sb2coXCJEeW5hbWljRGF0ZUZvcm1hdFwiLCBkeW5hbWljRGF0ZUZvcm1hdC5pbmNsdWRlcyhcInxcIikpXG5cdFx0XHRcdGlmIChkeW5hbWljRGF0ZUZvcm1hdC5pbmNsdWRlcyhcInxcIikpe1xuXHRcdFx0XHRcdGNvbnN0IG9mZnNldCA9IGR5bmFtaWNEYXRlRm9ybWF0LnNwbGl0KFwifFwiKVsxXTtcblx0XHRcdFx0XHR0aGlzLmxvZyhcIk9mZnNldFwiLCBvZmZzZXQpO1xuXHRcdFx0XHRcdGR5bmFtaWNEYXRlRm9ybWF0ID0gZHluYW1pY0RhdGVGb3JtYXQuc3BsaXQoXCJ8XCIpWzBdO1xuXHRcdFx0XHRcdHRoaXMubG9nKFwiZHluYW1pY0RhdGVNYXRjaFwiLGR5bmFtaWNEYXRlRm9ybWF0KVxuXHRcdFx0XHRcdGlmICggL14tP1xcZCskLy50ZXN0KG9mZnNldCkpe1xuXHRcdFx0XHRcdFx0dGhpcy5sb2coXCJOdW1iZXJcIik7XG5cdFx0XHRcdFx0XHRkdXJhdGlvbiA9IHdpbmRvdy5tb21lbnQuZHVyYXRpb24oTnVtYmVyKG9mZnNldCksIFwiZGF5c1wiKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhpcy5sb2coXCJTdHJpbmdcIik7XG5cdFx0XHRcdFx0XHRkdXJhdGlvbiA9IHdpbmRvdy5tb21lbnQuZHVyYXRpb24ob2Zmc2V0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5sb2coXCJEdXJhdGlvblwiLGR1cmF0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCBkeW5hbWljRGF0ZSA9IHdpbmRvdy5tb21lbnQoKS5hZGQoZHVyYXRpb24pLmZvcm1hdChkeW5hbWljRGF0ZUZvcm1hdCk7XG5cdFx0XHRcdHRoaXMubG9nKFwiRHluYW1pY0RhdGVcIiwgZHluYW1pY0RhdGUpO1xuXHRcdFx0XHQvLyBUb2RvOiBmaWd1cmUgb3V0IGhvdyB0byBoYW5kbGUgd3JvbmcgZm9ybWF0cyBjb3JyZWN0bHkuLiBtb3N0IGZvcm1hdHMgYXJlIHZhbGlkIGJ1dCBjcmVhdGUgdW5kZXNpcmVkIHJlc3VsdHMuLi5cblx0XHRcdFx0aWYgKCF3aW5kb3cubW9tZW50KHdpbmRvdy5tb21lbnQubm93KCksZHluYW1pY0RhdGVGb3JtYXQsdHJ1ZSkuaXNWYWxpZCB8fCBkeW5hbWljRGF0ZSA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdER5bmJlZGRlZC5kaXNwbGF5RXJyb3IoZWwsIFwiTm90IGEgdmFsaWQgTW9tZW50LmpzIFRpbWUgZm9ybWF0OiBcIisgZHluYW1pY0RhdGVGb3JtYXQpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRmaWxlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoZHluYW1pY0RhdGVNYXRjaFBhdHRlcm4sZHluYW1pY0RhdGUpO1xuXHRcdFx0XHR0aGlzLmxvZyhcIkR5bmFtaWNGaWxlTmFtZVwiLCBmaWxlTmFtZSk7XG5cdFx0XHR9XG5cdFx0XHRsZXQgaGVhZGVyID0gXCJcIjtcblx0XHRcdGlmIChmaWxlTmFtZS5jb250YWlucyhcIiNcIikpIHtcblx0XHRcdFx0aGVhZGVyID0gZmlsZU5hbWUuc3BsaXQoXCIjXCIpWzFdO1xuXHRcdFx0XHRmaWxlTmFtZSA9IGZpbGVOYW1lLnNwbGl0KFwiI1wiKVswXTtcblx0XHRcdFx0dGhpcy5sb2coXCJIZWFkZXJcIixoZWFkZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBtYXRjaGluZ0ZpbGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGZpbGVOYW1lLCAnJyk7XG5cdFx0XHR0aGlzLmxvZyhcIk1hdGNoaW5nRmlsZVwiLCBtYXRjaGluZ0ZpbGUpO1xuXHRcdFx0aWYgKCFtYXRjaGluZ0ZpbGUpIHtcblx0XHRcdFx0RHluYmVkZGVkLmRpc3BsYXlFcnJvcihlbCwgXCJGaWxlIGxpbmsgbm90IGZvdW5kOiBbW1wiKyBmaWxlTmFtZSArIFwiXV1cIik7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vIFRvZG86IGNvdWxkIHRoaXMgYmUgbW92ZWQgdXA/XG5cdFx0XHRpZiAobWF0Y2hpbmdGaWxlLmV4dGVuc2lvbiAhPT0gXCJtZFwiKSB7XG5cdFx0XHRcdER5bmJlZGRlZC5kaXNwbGF5RXJyb3IoZWwsIFwiQmFkIGZpbGUgZXh0ZW5zaW9uIGZvdW5kLCBleHBlY3RlZCBtYXJrZG93bjogXCIgKyBtYXRjaGluZ0ZpbGUpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGxldCBmaWxlQ29udGVudHMgPSBcIlwiXG5cdFx0XHRpZiAoaGVhZGVyICE9IFwiXCIpe1xuXHRcdFx0XHQvLyBAdHMtaWdub3JlXG5cdFx0XHRcdGNvbnN0IGhlYWRpbmdzID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUobWF0Y2hpbmdGaWxlKS5oZWFkaW5ncztcblx0XHRcdFx0aWYgKGhlYWRpbmdzID09PSBudWxsIHx8IGhlYWRpbmdzID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRjb25zdCBlcnJvck1lc3NhZ2UgPSBcIkhlYWRlciBcXFwiXCIgKyBoZWFkZXIgKyBcIlxcXCIgbm90IGZvdW5kIGluIFtbXCIrIGZpbGVOYW1lICsgXCJdXVwiO1xuXHRcdFx0XHRcdER5bmJlZGRlZC5kaXNwbGF5RXJyb3IoZWwsIGVycm9yTWVzc2FnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5sb2coXCJIZWFkaW5nc1wiLCBoZWFkaW5ncyk7XG5cdFx0XHRcdGxldCBwb3NpdGlvbjtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBoZWFkaW5ncy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGNvbnN0IGhlYWRpbmcgPSBoZWFkaW5nc1tpXTtcblx0XHRcdFx0XHR0aGlzLmxvZyhcIkhlYWRpbmdcIixoZWFkaW5nKVxuXHRcdFx0XHRcdGlmIChoZWFkaW5nLmhlYWRpbmcgPT0gaGVhZGVyKSB7XG5cdFx0XHRcdFx0XHRpZiAoaSA9PSBoZWFkaW5ncy5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdFx0XHRcdHBvc2l0aW9uID0gW2hlYWRpbmcucG9zaXRpb24uc3RhcnQubGluZSwgLTFdO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0cG9zaXRpb24gPSBbaGVhZGluZy5wb3NpdGlvbi5zdGFydC5saW5lLCBoZWFkaW5nc1tpICsgMV0ucG9zaXRpb24uc3RhcnQubGluZV07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChwb3NpdGlvbikge1xuXHRcdFx0XHRcdGxldCB0ZXh0ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZChtYXRjaGluZ0ZpbGUpXG5cdFx0XHRcdFx0aWYgKCF0ZXh0LmVuZHNXaXRoKFwiXFxuXCIpKSB7XG5cdFx0XHRcdFx0XHR0ZXh0ID0gdGV4dCArIFwiXFxuXCJcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5sb2coXCJQb3NpdGlvblwiLHBvc2l0aW9uKTtcblx0XHRcdFx0XHR0aGlzLmxvZyhcIlRleHRcIix0ZXh0KTtcblx0XHRcdFx0XHRmaWxlQ29udGVudHMgPSB0ZXh0LnNwbGl0KFwiXFxuXCIpLnNsaWNlKHBvc2l0aW9uWzBdICsgMSwgcG9zaXRpb25bMV0pLmpvaW4oXCJcXG5cIik7XG5cdFx0XHRcdFx0dGhpcy5sb2coXCJTcGxpdFwiLGZpbGVDb250ZW50cylcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmlsZUNvbnRlbnRzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZChtYXRjaGluZ0ZpbGUpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGZpbGVDb250ZW50cyA9PSBcIlwiKSB7XG5cdFx0XHRcdGNvbnN0IGVycm9yTWVzc2FnZSA9IFwiSGVhZGVyIFxcXCJcIiArIGhlYWRlciArIFwiXFxcIiBub3QgZm91bmQgaW4gW1tcIisgZmlsZU5hbWUgKyBcIl1dXCI7XG5cdFx0XHRcdER5bmJlZGRlZC5kaXNwbGF5RXJyb3IoZWwsIGVycm9yTWVzc2FnZSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRoaXMubG9nKFwiRmlsZVwiLGZpbGVDb250ZW50cylcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGVsLmNyZWF0ZURpdih7IGNsczogW0R5bmJlZGRlZC5jb250YWluZXJDbGFzc10gfSk7XG5cdFx0XHRhd2FpdCBNYXJrZG93blJlbmRlcmVyLnJlbmRlck1hcmtkb3duKGZpbGVDb250ZW50cywgY29udGFpbmVyLCBjdHguc291cmNlUGF0aCwgdGhpcyk7XG5cdFx0fSk7XG5cdH1cblxuXHRvbnVubG9hZCgpIHtcblx0XHR0aGlzLmxvZyhcIlVubG9hZGluZyBQbHVnaW5cIilcblx0fVxuXG5cdGxvZyguLi5hcmdzOiBQYXJhbWV0ZXJzPExvZ1R5cGU+KSB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRlYnVnTG9nZ2luZykge1xuICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5wbHVnaW5OYW1lICsgXCItRGVidWc6XCIsIC4uLmFyZ3MpO1xuXHRcdH1cblx0fVx0XG5cblxuXHRhc3luYyBsb2FkU2V0dGluZ3MoKSB7XG5cdFx0dGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XG5cdFx0dGhpcy5sb2coXCJTZXR0aW5ncyBsb2FkZWRcIix0aGlzLnNldHRpbmdzKTtcblx0fVxuXG5cdGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcblx0XHRhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuXHRcdHRoaXMubG9nKFwiU2V0dGluZ3Mgc2F2ZWRcIix0aGlzLnNldHRpbmdzKTtcblx0fVxufVxuXG5cblxuXG5cbiIsICJpbXBvcnQgeyBBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgRHluYmVkZGVkIGZyb20gJy4vbWFpbic7XG5cbi8vIFJlbWVtYmVyIHRvIHJlbmFtZSB0aGVzZSBjbGFzc2VzIGFuZCBpbnRlcmZhY2VzIVxuZXhwb3J0IGludGVyZmFjZSBEeW5iZWRkZWRTZXR0aW5ncyB7XG5cdGRlYnVnTG9nZ2luZzogYm9vbGVhblxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUyA9IHtcblx0ZGVidWdMb2dnaW5nOiBmYWxzZVxufTtcblxuXG5leHBvcnQgY2xhc3MgRHluYmVkZGVkU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuXHRwcml2YXRlIHBsdWdpbjogRHluYmVkZGVkO1xuXG5cdGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IER5bmJlZGRlZCkge1xuXHRcdHN1cGVyKGFwcCwgcGx1Z2luKTtcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcblx0fVxuXG5cdGRpc3BsYXkoKTogdm9pZCB7XG5cdFx0Y29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcblxuXHRcdGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cblx0XHRjb250YWluZXJFbC5jcmVhdGVFbCgnaDEnLCB7IHRleHQ6IHRoaXMucGx1Z2luLnBsdWdpbk5hbWV9KTtcblx0XHRjb250YWluZXJFbC5jcmVhdGVFbCgnaDInLCB7IHRleHQ6IHRoaXMucGx1Z2luLnBsdWdpbkRlc2NyaXB0aW9ufSk7XG5cdFx0Y29udGFpbmVyRWwuY3JlYXRlRWwoJ2InLCB7IHRleHQ6ICcgVmVyc2lvbjogJyArIHRoaXMucGx1Z2luLnBsdWdpblZlcnNpb24gfSk7XG5cdFx0Y29udGFpbmVyRWwuY3JlYXRlRWwoJ2JyJywge3RleHQ6ICcnfSlcblx0XHRjb250YWluZXJFbC5jcmVhdGVFbCgnYnInLCB7dGV4dDogJyd9KVxuXHRcdGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdhJywge3RleHQ6ICdDcmVhdGVkIGJ5ICcgKyB0aGlzLnBsdWdpbi5wbHVnaW5BdXRob3IsIGhyZWY6IHRoaXMucGx1Z2luLnBsdWdpbkF1dGhvclVybH0pXG5cdFx0Y29udGFpbmVyRWwuY3JlYXRlRWwoJ2JyJywge3RleHQ6ICcnfSlcblx0XHRjb250YWluZXJFbC5jcmVhdGVFbCgnYnInLCB7dGV4dDogJyd9KVxuXHRcdGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdhJywge3RleHQ6ICdQbHVnaW4gRG9jdW1lbnRhdGlvbicsIGhyZWY6IHRoaXMucGx1Z2luLnBsdWdpbkRvY3VtZW50YXRpb25Vcmx9KVxuXHRcdGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdicicsIHt0ZXh0OiAnJ30pXG5cdFx0Y29udGFpbmVyRWwuY3JlYXRlRWwoJ2JyJywge3RleHQ6ICcnfSlcblx0XHQvLyBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdDb25maWd1cmF0aW9uOid9KTtcblx0XHQvLyB0YWtlIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3pzdmljemlhbi9vYnNpZGlhbi1leGNhbGlkcmF3LXBsdWdpbi9ibG9iLzA0MzY3YmQzY2Q5NmExNjIxODU0MDExMzk5OTVmN2ZjNDg0ODE0NzAvc3JjL3NldHRpbmdzLnRzI0wyNjFcblx0XHRjb25zdCBjb2ZmZWVEaXYgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoXCJjb2ZmZWVcIik7XG5cdFx0Y29mZmVlRGl2LmFkZENsYXNzKFwiZXgtY29mZmVlLWRpdlwiKTtcblx0XHRjb25zdCBjb2ZmZWVMaW5rID0gY29mZmVlRGl2LmNyZWF0ZUVsKFwiYVwiLCB7XG5cdFx0XHRocmVmOiBcImh0dHBzOi8va28tZmkuY29tL21tb21tXCIsXG5cdFx0fSk7XG5cdFx0Y29uc3QgY29mZmVlSW1nID0gY29mZmVlTGluay5jcmVhdGVFbChcImltZ1wiLCB7XG5cdFx0XHRhdHRyOiB7XG5cdFx0XHRcdHNyYzogXCJodHRwczovL2Nkbi5rby1maS5jb20vY2RuL2tvZmkzLnBuZz92PTNcIixcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0Y29mZmVlSW1nLmhlaWdodCA9IDQ1O1xuXG4vLyBMZWF2ZSB0aGlzIGFsb25lIVxuXHRcdGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ0RldmVsb3BlciBTZXR0aW5ncycgfSk7XG5cblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcblx0XHRcdC5zZXROYW1lKCdFbmFibGUgRGVidWcgTG9nZ2luZycpXG5cdFx0XHQuc2V0RGVzYygnSWYgdGhpcyBpcyBlbmFibGVkLCBtb3JlIHRoaW5ncyBhcmUgcHJpbnRlZCB0byB0aGUgY29uc29sZS4nKVxuXHRcdFx0LmFkZFRvZ2dsZSh0b2dnbGUgPT5cblx0XHRcdFx0dG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlYnVnTG9nZ2luZykub25DaGFuZ2UoYXN5bmMgdmFsdWUgPT4ge1xuXHRcdFx0XHRcdHRoaXMucGx1Z2luLmxvZyhcIkRlYnVnIExvZ2dpbmdcIiwgdmFsdWUpXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVidWdMb2dnaW5nID0gdmFsdWU7XG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHQpO1xuXHR9XG59XG5cblxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUF1Qzs7O0FDQXZDLHNCQUErQztBQVF4QyxJQUFNLG1CQUFtQjtBQUFBLEVBQy9CLGNBQWM7QUFDZjtBQUdPLElBQU0sc0JBQU4sY0FBa0MsaUNBQWlCO0FBQUEsRUFHekQsWUFBWSxLQUFVLFFBQW1CO0FBQ3hDLFVBQU0sS0FBSyxNQUFNO0FBQ2pCLFNBQUssU0FBUztBQUFBLEVBQ2Y7QUFBQSxFQUVBLFVBQWdCO0FBQ2YsVUFBTSxFQUFFLGdCQUFnQjtBQUV4QixnQkFBWSxNQUFNO0FBRWxCLGdCQUFZLFNBQVMsTUFBTSxFQUFFLE1BQU0sS0FBSyxPQUFPLFdBQVUsQ0FBQztBQUMxRCxnQkFBWSxTQUFTLE1BQU0sRUFBRSxNQUFNLEtBQUssT0FBTyxrQkFBaUIsQ0FBQztBQUNqRSxnQkFBWSxTQUFTLEtBQUssRUFBRSxNQUFNLGVBQWUsS0FBSyxPQUFPLGNBQWMsQ0FBQztBQUM1RSxnQkFBWSxTQUFTLE1BQU0sRUFBQyxNQUFNLEdBQUUsQ0FBQztBQUNyQyxnQkFBWSxTQUFTLE1BQU0sRUFBQyxNQUFNLEdBQUUsQ0FBQztBQUNyQyxnQkFBWSxTQUFTLEtBQUssRUFBQyxNQUFNLGdCQUFnQixLQUFLLE9BQU8sY0FBYyxNQUFNLEtBQUssT0FBTyxnQkFBZSxDQUFDO0FBQzdHLGdCQUFZLFNBQVMsTUFBTSxFQUFDLE1BQU0sR0FBRSxDQUFDO0FBQ3JDLGdCQUFZLFNBQVMsTUFBTSxFQUFDLE1BQU0sR0FBRSxDQUFDO0FBQ3JDLGdCQUFZLFNBQVMsS0FBSyxFQUFDLE1BQU0sd0JBQXdCLE1BQU0sS0FBSyxPQUFPLHVCQUFzQixDQUFDO0FBQ2xHLGdCQUFZLFNBQVMsTUFBTSxFQUFDLE1BQU0sR0FBRSxDQUFDO0FBQ3JDLGdCQUFZLFNBQVMsTUFBTSxFQUFDLE1BQU0sR0FBRSxDQUFDO0FBR3JDLFVBQU0sWUFBWSxZQUFZLFVBQVUsUUFBUTtBQUNoRCxjQUFVLFNBQVMsZUFBZTtBQUNsQyxVQUFNLGFBQWEsVUFBVSxTQUFTLEtBQUs7QUFBQSxNQUMxQyxNQUFNO0FBQUEsSUFDUCxDQUFDO0FBQ0QsVUFBTSxZQUFZLFdBQVcsU0FBUyxPQUFPO0FBQUEsTUFDNUMsTUFBTTtBQUFBLFFBQ0wsS0FBSztBQUFBLE1BQ047QUFBQSxJQUNELENBQUM7QUFDRCxjQUFVLFNBQVM7QUFHbkIsZ0JBQVksU0FBUyxNQUFNLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV6RCxRQUFJLHdCQUFRLFdBQVcsRUFDckIsUUFBUSxzQkFBc0IsRUFDOUIsUUFBUSw2REFBNkQsRUFDckUsVUFBVSxZQUNWLE9BQU8sU0FBUyxLQUFLLE9BQU8sU0FBUyxZQUFZLEVBQUUsU0FBUyxPQUFNLFVBQVM7QUFDMUUsV0FBSyxPQUFPLElBQUksaUJBQWlCLEtBQUs7QUFDdEMsV0FBSyxPQUFPLFNBQVMsZUFBZTtBQUNwQyxZQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsSUFDaEMsQ0FBQyxDQUNGO0FBQUEsRUFDRjtBQUNEOzs7QUQzREEsSUFBcUIsYUFBckIsY0FBdUMsd0JBQU87QUFBQSxFQUE5QztBQUFBO0FBRUMsc0JBQWEsS0FBSyxTQUFTO0FBQzNCLDZCQUFvQixLQUFLLFNBQVM7QUFDbEMseUJBQWdCLEtBQUssU0FBUztBQUM5Qix3QkFBZSxLQUFLLFNBQVM7QUFDN0IsMkJBQWtCLEtBQUssU0FBUztBQUNoQyxrQ0FBeUI7QUFBQTtBQUFBLEVBWXpCLE1BQU0sU0FBUztBQUNkLFVBQU0sS0FBSyxhQUFhO0FBQ3hCLFNBQUssSUFBSSxnQkFBZ0I7QUFHekIsU0FBSyxjQUFjLElBQUksb0JBQW9CLEtBQUssS0FBSyxJQUFJLENBQUM7QUFHMUQsU0FBSyxtQ0FBbUMsV0FBVSxrQkFBa0IsT0FBTyxRQUFRLElBQUksUUFBUTtBQUM5RixZQUFNLHVCQUF1QjtBQUM3QixZQUFNLGdCQUFnQixxQkFBcUIsS0FBSyxNQUFNO0FBRXRELFdBQUssSUFBSSxpQkFBaUIsYUFBYTtBQUV2QyxVQUFJLENBQUMsZUFBZTtBQUNuQixtQkFBVSxhQUFhLElBQUksb0JBQW9CLE1BQU07QUFDckQ7QUFBQSxNQUNEO0FBQ0EsVUFBSSxXQUFXLGNBQWM7QUFFN0IsWUFBTSwwQkFBMEI7QUFDaEMsWUFBTSxtQkFBbUIsd0JBQXdCLEtBQUssUUFBUTtBQUM5RCxXQUFLLElBQUksb0JBQW9CLGdCQUFnQjtBQUM3QyxVQUFJLHFCQUFxQixNQUFNO0FBQzlCLFlBQUksb0JBQW9CLGlCQUFpQjtBQUN6QyxZQUFJLFdBQVcsT0FBTyxPQUFPLFNBQVMsQ0FBQztBQUN2QyxhQUFLLElBQUkscUJBQXFCLGtCQUFrQixTQUFTLEdBQUcsQ0FBQztBQUM3RCxZQUFJLGtCQUFrQixTQUFTLEdBQUcsR0FBRTtBQUNuQyxnQkFBTSxTQUFTLGtCQUFrQixNQUFNLEdBQUcsRUFBRTtBQUM1QyxlQUFLLElBQUksVUFBVSxNQUFNO0FBQ3pCLDhCQUFvQixrQkFBa0IsTUFBTSxHQUFHLEVBQUU7QUFDakQsZUFBSyxJQUFJLG9CQUFtQixpQkFBaUI7QUFDN0MsY0FBSyxVQUFVLEtBQUssTUFBTSxHQUFFO0FBQzNCLGlCQUFLLElBQUksUUFBUTtBQUNqQix1QkFBVyxPQUFPLE9BQU8sU0FBUyxPQUFPLE1BQU0sR0FBRyxNQUFNO0FBQUEsVUFDekQsT0FBTztBQUNOLGlCQUFLLElBQUksUUFBUTtBQUNqQix1QkFBVyxPQUFPLE9BQU8sU0FBUyxNQUFNO0FBQUEsVUFDekM7QUFDQSxlQUFLLElBQUksWUFBVyxRQUFRO0FBQUEsUUFDN0I7QUFDQSxjQUFNLGNBQWMsT0FBTyxPQUFPLEVBQUUsSUFBSSxRQUFRLEVBQUUsT0FBTyxpQkFBaUI7QUFDMUUsYUFBSyxJQUFJLGVBQWUsV0FBVztBQUVuQyxZQUFJLENBQUMsT0FBTyxPQUFPLE9BQU8sT0FBTyxJQUFJLEdBQUUsbUJBQWtCLElBQUksRUFBRSxXQUFXLGdCQUFnQixNQUFNO0FBQy9GLHFCQUFVLGFBQWEsSUFBSSx3Q0FBdUMsaUJBQWlCO0FBQ25GO0FBQUEsUUFDRDtBQUNBLG1CQUFXLFNBQVMsUUFBUSx5QkFBd0IsV0FBVztBQUMvRCxhQUFLLElBQUksbUJBQW1CLFFBQVE7QUFBQSxNQUNyQztBQUNBLFVBQUksU0FBUztBQUNiLFVBQUksU0FBUyxTQUFTLEdBQUcsR0FBRztBQUMzQixpQkFBUyxTQUFTLE1BQU0sR0FBRyxFQUFFO0FBQzdCLG1CQUFXLFNBQVMsTUFBTSxHQUFHLEVBQUU7QUFDL0IsYUFBSyxJQUFJLFVBQVMsTUFBTTtBQUFBLE1BQ3pCO0FBRUEsWUFBTSxlQUFlLEtBQUssSUFBSSxjQUFjLHFCQUFxQixVQUFVLEVBQUU7QUFDN0UsV0FBSyxJQUFJLGdCQUFnQixZQUFZO0FBQ3JDLFVBQUksQ0FBQyxjQUFjO0FBQ2xCLG1CQUFVLGFBQWEsSUFBSSw0QkFBMkIsV0FBVyxJQUFJO0FBQ3JFO0FBQUEsTUFDRDtBQUVBLFVBQUksYUFBYSxjQUFjLE1BQU07QUFDcEMsbUJBQVUsYUFBYSxJQUFJLGtEQUFrRCxZQUFZO0FBQ3pGO0FBQUEsTUFDRDtBQUVBLFVBQUksZUFBZTtBQUNuQixVQUFJLFVBQVUsSUFBRztBQUVoQixjQUFNLFdBQVcsS0FBSyxJQUFJLGNBQWMsYUFBYSxZQUFZLEVBQUU7QUFDbkUsWUFBSSxhQUFhLFFBQVEsYUFBYSxRQUFXO0FBQ2hELGdCQUFNLGVBQWUsYUFBYyxTQUFTLHNCQUFzQixXQUFXO0FBQzdFLHFCQUFVLGFBQWEsSUFBSSxZQUFZO0FBQUEsUUFDeEM7QUFDQSxhQUFLLElBQUksWUFBWSxRQUFRO0FBQzdCLFlBQUk7QUFDSixpQkFBUyxJQUFJLEdBQUcsSUFBSSxTQUFTLFFBQVEsS0FBSztBQUN6QyxnQkFBTSxVQUFVLFNBQVM7QUFDekIsZUFBSyxJQUFJLFdBQVUsT0FBTztBQUMxQixjQUFJLFFBQVEsV0FBVyxRQUFRO0FBQzlCLGdCQUFJLEtBQUssU0FBUyxTQUFTLEdBQUc7QUFDN0IseUJBQVcsQ0FBQyxRQUFRLFNBQVMsTUFBTSxNQUFNLEVBQUU7QUFBQSxZQUM1QyxPQUFPO0FBQ04seUJBQVcsQ0FBQyxRQUFRLFNBQVMsTUFBTSxNQUFNLFNBQVMsSUFBSSxHQUFHLFNBQVMsTUFBTSxJQUFJO0FBQUEsWUFDN0U7QUFBQSxVQUNEO0FBQUEsUUFDRDtBQUNBLFlBQUksVUFBVTtBQUNiLGNBQUksT0FBTyxNQUFNLEtBQUssSUFBSSxNQUFNLFdBQVcsWUFBWTtBQUN2RCxjQUFJLENBQUMsS0FBSyxTQUFTLElBQUksR0FBRztBQUN6QixtQkFBTyxPQUFPO0FBQUEsVUFDZjtBQUNBLGVBQUssSUFBSSxZQUFXLFFBQVE7QUFDNUIsZUFBSyxJQUFJLFFBQU8sSUFBSTtBQUNwQix5QkFBZSxLQUFLLE1BQU0sSUFBSSxFQUFFLE1BQU0sU0FBUyxLQUFLLEdBQUcsU0FBUyxFQUFFLEVBQUUsS0FBSyxJQUFJO0FBQzdFLGVBQUssSUFBSSxTQUFRLFlBQVk7QUFBQSxRQUM5QjtBQUFBLE1BQ0QsT0FBTztBQUNOLHVCQUFlLE1BQU0sS0FBSyxJQUFJLE1BQU0sV0FBVyxZQUFZO0FBQUEsTUFDNUQ7QUFDQSxVQUFJLGdCQUFnQixJQUFJO0FBQ3ZCLGNBQU0sZUFBZSxhQUFjLFNBQVMsc0JBQXNCLFdBQVc7QUFDN0UsbUJBQVUsYUFBYSxJQUFJLFlBQVk7QUFDdkM7QUFBQSxNQUNEO0FBQ0EsV0FBSyxJQUFJLFFBQU8sWUFBWTtBQUM1QixZQUFNLFlBQVksR0FBRyxVQUFVLEVBQUUsS0FBSyxDQUFDLFdBQVUsY0FBYyxFQUFFLENBQUM7QUFDbEUsWUFBTSxrQ0FBaUIsZUFBZSxjQUFjLFdBQVcsSUFBSSxZQUFZLElBQUk7QUFBQSxJQUNwRixDQUFDO0FBQUEsRUFDRjtBQUFBLEVBRUEsV0FBVztBQUNWLFNBQUssSUFBSSxrQkFBa0I7QUFBQSxFQUM1QjtBQUFBLEVBRUEsT0FBTyxNQUEyQjtBQUMzQixRQUFJLEtBQUssU0FBUyxjQUFjO0FBQzVCLGNBQVEsSUFBSSxLQUFLLGFBQWEsV0FBVyxHQUFHLElBQUk7QUFBQSxJQUMxRDtBQUFBLEVBQ0Q7QUFBQSxFQUdBLE1BQU0sZUFBZTtBQUNwQixTQUFLLFdBQVcsT0FBTyxPQUFPLENBQUMsR0FBRyxrQkFBa0IsTUFBTSxLQUFLLFNBQVMsQ0FBQztBQUN6RSxTQUFLLElBQUksbUJBQWtCLEtBQUssUUFBUTtBQUFBLEVBQ3pDO0FBQUEsRUFFQSxNQUFNLGVBQWU7QUFDcEIsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQ2pDLFNBQUssSUFBSSxrQkFBaUIsS0FBSyxRQUFRO0FBQUEsRUFDeEM7QUFDRDtBQTFKQSxJQUFxQixZQUFyQjtBQVNDLEFBVG9CLFVBU2IsbUJBQW1CO0FBQzFCLEFBVm9CLFVBVWIsaUJBQWlCO0FBQ3hCLEFBWG9CLFVBV2IsYUFBYTtBQUVwQixBQWJvQixVQWFiLGVBQWUsQ0FBQyxRQUFxQixTQUFpQjtBQUM1RCxVQUFRLElBQUkscUJBQW9CLElBQUk7QUFDcEMsU0FBTyxTQUFTLE9BQU8sRUFBRSxNQUFNLHVCQUF1QixNQUFNLEtBQUssQ0FBQyxXQUFVLGdCQUFnQixXQUFVLFVBQVUsRUFBRSxDQUFDO0FBQ3BIOyIsCiAgIm5hbWVzIjogW10KfQo=