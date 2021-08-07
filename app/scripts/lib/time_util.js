function parseTimeString(str) {
    const timeParts = str.split(":");
    const secPart = timeParts.pop();
    let secs = parseFloat(secPart);
    const minPart = timeParts.pop();
    if (minPart) secs += parseInt(minPart) * 60;
    const hourPart = timeParts.pop();
    if (hourPart) secs += parseInt(hourPart) * 60 * 60;
    return secs;
}

function formatTimeMS(ms) {
    return `.${Math.floor(ms % 1 * 1000).toString().padStart(3, '0')}`;
}

function formatTimeString(secs) {
    const hours = Math.floor(secs / 60 / 60);
    const minutes = Math.floor(secs / 60) - (hours * 60);
    const seconds = secs % 60;

    const formatted = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    const msPart = Number.isInteger(secs) ? "" : formatTimeMS(secs);
    return formatted + msPart;
}

export { parseTimeString, formatTimeMS, formatTimeString };
