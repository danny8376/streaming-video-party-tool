import { CommonBase } from "./lib/platform_common_base";

class YouTube extends CommonBase {
    constructor() {
        super();
        this.platformName = "youtube"; // more stable to set it static
        this.sandboxEscapeOrigins = ["https://www.youtube.com"];
        this.adCheckSelector = ".ytp-ad-skip-button";
    }

    injectControl(dom) {
        document.querySelector("ytd-player").insertAdjacentElement("afterend", dom);
    }

    _init() {
        this.patchForSandboxEscape(`
            switch (cmd) {
                case "getPlayingStatus":
                    response(cmd,
                        player.getPlayerState() !== 1,
                        player.getCurrentTime()
                    );
                    break;
                case "getCurrentTime":
                    response(cmd, player.getCurrentTime());
                    break;
                case "seek":
                    const [targetSecs] = args;
                    player.seekTo(targetSecs);
                    break;
                case "play":
                    player.playVideo();
                    break;
                case "pause":
                    player.pauseVideo();
                    break;
                case "getPaused":
                    response(cmd, player.getPlayerState() !== 1);
                    break;
                case "getVideoId":
                    response(cmd, player.getVideoData().video_id);
                    break;
            }
        `,`
            const player = document.querySelector("#movie_player");
        `, {
            jsVideoId: true,
            jsFunctions: true,
            jsPlayingStatus: true
        });
    }
}

window.streamingVideoPartyToolPlatform = new YouTube();
