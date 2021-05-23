import { CommonBase } from "./lib/platform_common_base";

class YouTube extends CommonBase {
    constructor() {
        super();
        this.adCheckSelector = ".ytp-ad-skip-button";
        this.timeSelector = ".ytp-time-current";
    }
}

window.streamingVideoPartyToolPlatform = new YouTube();
