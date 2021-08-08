class PartyDummy {
    init() {}
    running() { return true; }
    start() {}
    stop() {}
    async getVideoInfo() {
        return {
            platform: this.constructor.name.toLowerCase(),
            id: "dummy",
            offset: 0.0
        };
    }
    injectControl(dom) { // per platform
    }
}

window.streamingVideoPartyToolPlatform = new PartyDummy();
