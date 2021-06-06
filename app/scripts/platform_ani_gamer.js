import { CommonBase } from "./lib/platform_common_base";

class AniGamer extends CommonBase {
    constructor() {
        super();
        this.sandboxEscapeOrigins = ["https://ani.gamer.com.tw"];
        this.adCheckSelector = "#adSkipButton";
        //this.timeSelector = ".vjs-current-time-display";
        this.playerCanPlay = false;
    }

    async checkPlayerReady() {
        if (document.querySelector(".R18")) { // age check blocking first
            return false;
        }
        if (await this.checkAd()) { // in ad
            return false;
        }
        return this.playerCanPlay;
    }

    _init() {
        window.addEventListener("message", async (e) => {
            if (this.sandboxEscapeOrigins.includes(e.origin)) {
                if (e.data === "streamingVideoPartyToolPlatform_AniGamer_canplay") {
                    this.playerCanPlay = true;
                    this.dispatchEvent(new Event("playerReady"));
                }
            }
        });

        this.patchForSandboxEscape(`
            switch (cmd) {
                case "getPlayingStatus":
                    response(cmd,
                        player.paused(),
                        player.currentTime()
                    );
                    break;
                case "getCurrentTime":
                    response(cmd, player.currentTime());
                    break;
                case "seek":
                    const [targetSecs] = args;
                    player.currentTime(targetSecs);
                    break;
                case "play":
                    player.play();
                    break;
                case "pause":
                    player.pause();
                    break;
                case "getPaused":
                    response(cmd, player.paused());
                    break;
                case "getVideoId":
                    response(cmd, animefun.videoSn);
                    break;
            }
        `,`
            const player = videojs("ani_video");
            player.on("loadeddata", () => {
                window.postMessage("streamingVideoPartyToolPlatform_AniGamer_canplay");
            });
        `, {
            jsVideoId: true,
            jsFunctions: true,
            jsPlayingStatus: true
        });
    }
}

window.streamingVideoPartyToolPlatform = new AniGamer();
