class CommonBase extends EventTarget {
    constructor() {
        super();
        this.interval = null;
        this.lastTimeString = "";
        this.adCheckSelector = "";
        this.timeSelector = "";
    }

    dispatchVideoTimeUpdate(timeString) {
        this.dispatchEvent(new CustomEvent("videoTimeUpdate", {
            detail: {
                timeString
            }
        }));
    }

    start() {
        this.interval = setInterval(() => {
            let timeString = "";
            if (document.querySelector(this.adCheckSelector)) {
                // in ad
                timeString = "0:00"
            } else {
                timeString = document.querySelector(this.timeSelector).textContent;
            }
            if (this.lastTimeString != timeString) {
                this.lastTimeString = timeString;
                this.dispatchVideoTimeUpdate(timeString);
            }
        }, 100);
    }

    stop() {
        clearInterval(this.interval);
    }
}

export { CommonBase };
