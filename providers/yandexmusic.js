"use strict";
// import { mprisCommands } from './common-constants.js'

function sendEvent(type) {
    console.log("sendEvent ", type);
    window.postMessage({type: type, namespace: "mpris2", direction: "from-content-script"}, "*");
}

const providerName = "yamusic";

function reportChange(data) {
    port.postMessage({
        source: providerName,
        type: "update",
        data: data
    });
}

function enterVideo(audio) {
    console.log("enter", audio);
    reportChange(audio);
}

const COMMANDS = {
    query(attr) {
        switch (attr) {
        case "Position":
            sendEvent(mprisCommands.GET_POSITION);
            break;
        }
    },

    Play() {
        sendEvent(mprisCommands.PLAY);
    },
    Pause() {
        sendEvent(mprisCommands.PAUSE);
    },
    PlayPause() {
        sendEvent(mprisCommands.PLAYPAUSE);
    },
    Stop() {
        sendEvent(mprisCommands.STOP);
    },

    Next() {
        sendEvent(mprisCommands.NEXT);
    },
    Prev() {
        sendEvent(mprisCommands.PREV);
    },

    Seek(offset) {
        window.postMessage({type: mprisCommands.SEEK, delta: offset, direction: "from-content-script"}, "*");
    },
    SetPosition({ id, position }) {
        console.log("id: ", id);
        window.postMessage({type: mprisCommands.SET_POSITION, Position: position, direction: "from-content-script"}, "*");
    },

    Rate(what) {

    },

    Volume(volume) {
        window.postMessage({type: mprisCommands.SET_VOLUME, volume: volume, direction: "from-content-script"}, "*");
    },
    Fullscreen() { },

    Shuffle(yes) {
        window.postMessage({type: mprisCommands.SHUFFLE, yes: yes, direction: "from-content-script"}, "*");
        // if ((yes && !playlist.shuffle) || (!yes && playlist.shuffle))
        //     $("#playlist-actions a").get(1).click();
    },
    LoopStatus(how) {
        window.postMessage({type: mprisCommands.SET_REPEAT, how: how, direction: "from-content-script"}, "*");
    }
};


const port = chrome.runtime.connect();
port.onMessage.addListener(({ cmd, data }) => {
    console.log("COMMAND", cmd);
    COMMANDS[cmd](data);
});

function update(change) {
    console.log("update", change);
    port.postMessage({
        source: "yamusic", type: "update", data: change,
    });
}

function quit() {
    port.postMessage({
        source: "yamusic", type: "quit",
    });
}

function injectScript(file_path) {
    const node = document.body;
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file_path);
    node.appendChild(script);
}

window.addEventListener("message", event => {
    // We only accept messages from ourselves
    if (event.source !== window)
        return;

    if (event.data.direction && event.data.direction === "from-page" && event.data.namespace === "mpris2") {
        console.log("Content script received message: ", event.data.type, event.data.text);

        const handlers = (() => {
            let res = [];
            res[mprisEvents.CONTROLS] = (change) => reportChange(change);
            res[mprisEvents.TRACK]    = (track)  => enterVideo(track);
            res[mprisEvents.START]    = ()       => update({ PlaybackStatus: "Playing" });
            res[mprisEvents.PAUSED]   = ()       => update({ PlaybackStatus: "Paused" });
            res[mprisEvents.POSITION] = (pos)    => update({ Position: pos });
            res[mprisEvents.SEEKED]   = (pos)    => update({ seekedTo: pos });
            return res;
        })();
        handlers[event.data.type](event.data.text);
    }
});

window.addEventListener("load", () => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = chrome.extension.getURL('providers/yandexmusic-injected.js');
    script.onload = function() { this.remove(); };
    document.head.appendChild(script);
});
