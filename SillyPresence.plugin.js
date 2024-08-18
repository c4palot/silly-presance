/**
 * @name SillyPresence
 * @version 1
 *
 * @author c4palot
 * @authorId 849180136828960799
 * @description A silly presence for discord.
 *
 * @updateUrl https://www.youtube.com/watch?v=Gnm3hIcjiCQ
 * @source https://raw.githubusercontent.com/c4palot/silly-presance/main/SillyPresence.plugin.js
 * @website https://www.youtube.com/watch?v=Gnm3hIcjiCQ
 */

// Updated August 6th, 2023

const defaultSettings = {
	clientID: "1155918490067271800",
	disableWhenActivity: false,
	enableStartTime: true,
	name: "felching 😼",
	details: "felching 😼",
	state: "HAWK TUAH!",
	button1Label: "MEET THE TUAHS!",
	button1URL: "https://youtu.be/RvWP3_rTleo?si=UUjPCMNAsz4L9pGP",
	button2Label: "",
	button2URL: "",
	smallImageKey: "",
	smallImageText: "",
	largeImageKey: "",
	largeImageText: "",
	listeningTo: false,
};

function isURL(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

class SillyPresence {
    constructor() {
        this.initialized = false;
        this.settings = {};
        this.startPlaying = Date.now();
        this.updateDataInterval = 0;
        this.rpc = {};

        let filter = BdApi.Webpack.Filters.byStrings("getAssetImage: size must === [number, number] for Twitch");
        let assetManager = BdApi.Webpack.getModule(m => typeof m === "object" && Object.values(m).some(filter));
        let getAsset;
        for (const key in assetManager) {
            const member = assetManager[key];
            if (member.toString().includes("apply(")) {
                getAsset = member;
                break;
            }
        }
        this.getAsset = async key => {
            return (await getAsset(this.settings.clientID, [key, undefined]))[0];
        };
    }
    async start() {
        this.initialize();
    }
    initialize() {
        console.log("Starting SillyPresence");
        BdApi.showToast("SillyPresence has started!");
        this.updateDataInterval = setInterval(() => this.updateData(), 60*1000); // every 60 seconds
        this.settings = BdApi.loadData("SillyPresence", "settings") || {};
        for (const setting of Object.keys(defaultSettings)) {
            if (typeof this.settings[setting] === "undefined") this.settings[setting] = defaultSettings[setting];
            this.updateSettings();
        }
        this.getLocalPresence = BdApi.findModuleByProps("getLocalPresence").getLocalPresence;
        this.rpc = BdApi.findModuleByProps("dispatch", "_subscriptions");
        this.rpcClientInfo = {};
        this.discordSetActivityHandler = null;
        this.updateRichPresence();
        this.initialized = true;
        this.request = require("request");
    }
    async stop() {
        clearInterval(this.updateDataInterval);
        this.updateDataInterval = 0;
        this.initialized = false;
        this.setActivity({});
        BdApi.showToast("SillyPresence is stopping!");
    }
    getSettingsPanel() {
        if (!this.initialized) return;
        this.settings = BdApi.loadData("SillyPresence", "settings") || {};
        const panel = document.createElement("form");
        panel.classList.add("form");
        panel.style.setProperty("width", "100%");
        this.generateSettings(panel);
        return panel;
    }
    async updateData() {
        if (!this.initialized) return;

        if(this.settings.disableWhenActivity) {
            const activities = this.getLocalPresence().activities;
            if(activities.filter(a => a.application_id !== this.settings.ClientID).length) {
                if(activities.find(a => a.application_id === this.settings.ClientID)) this.setActivity({});
                return;
            }
        }
        setTimeout(() => this.updateRichPresence(), 50);
    }
    createInput(label, description, type, classname, extrat='text') {
        let out = `<b>${label}</b><br><span>${description}</span><br><br>`
        if (type == 'onoff') out += `<select class="${classname} inputDefault-Ciwd-S input-3O04eu" style="width:80%"><option value="false">OFF</option><option value="true">ON</option></select>`
        if (type == 'input') out += `<input class="${classname} inputDefault-Ciwd-S input-3O04eu" placeholder="${label}" style="width:80%" type="${extrat}">`;
        return out + '<br><br>';
    }
    getSettingsPanel() {
        this.settings = BdApi.loadData("SillyPresence", "settings") || {};
        let template = document.createElement("template");
        template.innerHTML = `<div style="color: var(--header-primary);font-size: 16px;font-weight: 300;line-height: 22px;max-width: 550px;margin-top: 17px;">
${this.createInput('Client ID', 'Enter your Client ID (get from developers page) [needed for image keys]', 'input', 'clientid', 'number')}
${this.createInput('Activity Name', 'Enter a name for the activity', 'input', 'activityname')}
${this.createInput('Activity Details', 'Enter a description for the activity', 'input', 'activitydetails')}
${this.createInput('Activity State', 'Enter a second description for the activity', 'input', 'activitystate')}
${this.createInput('Activity Button 1 Text', 'Enter Text for button 1', 'input', 'activitybutton1text')}
${this.createInput('Activity Button 1 URL', 'Enter URL for button 1', 'input', 'activitybutton1url')}
${this.createInput('Activity Button 2 Text', 'Enter Text for button 2', 'input', 'activitybutton2text')}
${this.createInput('Activity Button 2 URL', 'Enter URL for button 2', 'input', 'activitybutton2url')}
${this.createInput('Activity Small Image Key', 'Enter Image Key for Small Icon', 'input', 'activityiconsmallimage')}
${this.createInput('Activity Small Image Text', 'Enter Label for Small Icon', 'input', 'activityiconsmalltext')}
${this.createInput('Activity Large Image Key', 'Enter Image Key for Large Icon', 'input', 'activityiconlargeimage')}
${this.createInput('Activity Large Image Text', 'Enter Label for Large Icon', 'input', 'activityiconlargetext')}
${this.createInput('Enable Start Time', 'Enable timestamp which shows the time when started', 'onoff', 'enablestarttime')}
${this.createInput('Listening Status', 'Enable listening status', 'onoff', 'listening')}
${this.createInput('Disable When Activity', 'Disables when there is another activity', 'onoff', 'disableactivity')}
</div>`;
        let clientidEl = template.content.firstElementChild.getElementsByClassName('clientid')[0];
        let nameEl = template.content.firstElementChild.getElementsByClassName('activityname')[0];
        let detailsEl = template.content.firstElementChild.getElementsByClassName('activitydetails')[0];
        let stateEl = template.content.firstElementChild.getElementsByClassName('activitystate')[0];
        let button1textEl = template.content.firstElementChild.getElementsByClassName('activitybutton1text')[0];
        let button1urlEl = template.content.firstElementChild.getElementsByClassName('activitybutton1url')[0];
        let button2textEl = template.content.firstElementChild.getElementsByClassName('activitybutton2text')[0];
        let button2urlEl = template.content.firstElementChild.getElementsByClassName('activitybutton2url')[0];
        let iconsmallkeyEl = template.content.firstElementChild.getElementsByClassName('activityiconsmallimage')[0];
        let iconsmalltextEl = template.content.firstElementChild.getElementsByClassName('activityiconsmalltext')[0];
        let iconlargekeyEl = template.content.firstElementChild.getElementsByClassName('activityiconlargeimage')[0];
        let iconlargetextEl = template.content.firstElementChild.getElementsByClassName('activityiconlargetext')[0];
        let enablestarttimeEl = template.content.firstElementChild.getElementsByClassName('enablestarttime')[0];
        let listeningEl = template.content.firstElementChild.getElementsByClassName('listening')[0];
        let disableEl = template.content.firstElementChild.getElementsByClassName('disableactivity')[0];
        let updateSetting = (e, setting) => {
            this.settings[setting] = e.target.value;
            this.updateSettings();
        }
        const TextInputs = [["clientID", clientidEl], ["name", nameEl], ["details", detailsEl], ["state", stateEl], ["button1Label", button1textEl], ["button1URL", button1urlEl], ["button2Label", button2textEl], ["button2URL", button2urlEl], ["smallImageKey", iconsmallkeyEl], ["smallImageText", iconsmalltextEl], ["largeImageKey", iconlargekeyEl], ["largeImageText", iconlargetextEl]];
        for (const [setting, el] of TextInputs) {
            el.value = this.settings[setting] ?? "";
            el.onchange = (e) => updateSetting(e, setting);
            el.onpaste = (e) => updateSetting(e, setting);
            el.onkeydown = (e) => updateSetting(e, setting);
        }
        const OnOffInputs = [["enableStartTime", enablestarttimeEl], ["listeningTo", listeningEl],["disableWhenActivity", disableEl]];
        for (const [setting, el] of OnOffInputs) {
            el.value = this.settings[setting] ? "true" : "false";
            el.onchange = () => {
                this.settings[setting] = el.value === "true";
                this.updateSettings();
            };
        }
        return template.content.firstElementChild;
    }
    setActivity(activity) {
        let obj = activity && Object.assign(activity, { flags: 1, type: this.settings.listeningTo ? 2 : 0 });
        console.log(obj);
        this.rpc.dispatch({
            type: "LOCAL_ACTIVITY_UPDATE",
            activity: obj
        });
    }
    async updateRichPresence() {
        if (this.paused) {
            return;
        }
        let button_urls = [], buttons = [];
        if(this.settings.button1Label != "" && this.settings.button1URL != "" && isURL(this.settings.button1URL)) {
            buttons.push(this.settings.button1Label);
            button_urls.push(this.settings.button1URL);
        }
        if(this.settings.button2Label != "" && this.settings.button2URL != "" && isURL(this.settings.button2URL)) {
            buttons.push(this.settings.button2Label);
            button_urls.push(this.settings.button2URL);
        }
        if (this.settings.enableStartTime) {
            if (this.startPlaying == null) this.startPlaying = Date.now();
        } else if (this.startPlaying) this.startPlaying = null;

        let obj = {
            application_id: this.settings.clientID ?? "1012465934088405062",
            name: this.settings.name || undefined,
            details: this.settings.details || undefined,
            state: this.settings.state || undefined,
            timestamps: { start: this.startPlaying ? Math.floor(this.startPlaying / 1000) : undefined },
            assets: (this.settings.smallImageKey && this.settings.smallImageKey != "") ? {
                small_image: await this.getAsset(this.settings.smallImageKey),
                small_text: this.settings.smallImageText ?? undefined,
            } : {},
            metadata: { button_urls }, buttons
        }
        if(this.settings.largeImageKey && this.settings.largeImageKey != "") {
            obj.assets.large_image = await this.getAsset(this.settings.largeImageKey);
            obj.assets.large_text = this.settings.largeImageText ?? undefined;
        }
        this.setActivity(obj);
    }
    
    updateSettings() {
        BdApi.saveData("SillyPresence", "settings", this.settings);
        this.updateData(); // will return when not initialized
    }
}

module.exports = SillyPresence;
