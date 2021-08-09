function ws2room(wsUrl) {
    const roomUrl = new URL(wsUrl);
    roomUrl.protocol = roomUrl.protocol === "wss:" ? "https" : "http";
    const urlWsOffset = roomUrl.pathname.lastIndexOf("ws/room/");
    const apiPrefix = roomUrl.pathname.slice(0, urlWsOffset);
    const roomId = roomUrl.pathname.slice(urlWsOffset + 8);
    roomUrl.pathname = `${apiPrefix}room/${roomId}`;
    return roomUrl.href;
}

export { ws2room };
