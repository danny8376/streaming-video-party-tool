export function validateWSURL(url) {
    try {
        const wsUrl = new URL(url)
        if (["ws:", "wss:"].includes(wsUrl.protocol)) {
            return true;
        } else {
            return false;
        }
    } catch (ex) {
    }
    return false;
}
