import { CommonBase } from "./lib/platform_common_base";

class YouTube extends CommonBase {
    constructor() {
        super();
        this.sandboxEscapeOrigins = ["https://www.youtube.com"];
        this.adCheckSelector = ".ytp-ad-skip-button";
        //this.timeSelector = ".ytp-time-current";
    }

    start() {
        this.patchForSandboxEscape(`
            switch (cmd) {
                case "getCurrentTime":
                    const secs = player.getCurrentTime();
                    response(cmd, secs);
                    break;
            }
        `,`
            const player = document.querySelector("#movie_player");
        `);

        super.start();
    }

    async loop() {
        let timeString = "";
        if (document.querySelector(this.adCheckSelector)) {
            // in ad
            timeString = "00:00:00"
        } else {
            const [secs] = await this.sandboxEscapeCmd("getCurrentTime");
            timeString = this.formatTimeString(Math.floor(secs));
        }
        this.checkTimeUpdate(timeString);
    }
}

window.streamingVideoPartyToolPlatform = new YouTube();
