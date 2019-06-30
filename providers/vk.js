"use strict";
// import { mprisCommands } from './common-constants-module.js'
// ^ ./common-constants.js is meant to be a module, but unfortunately content scripts are loaded without module support

function sendEvent(type) {
    window.postMessage({type: type, namespace: "mpris2", direction: "from-content-script"}, "*");
}

const providerName = "VK";

function reportChange(data) {
    console.log("reportChange", data);
    port.postMessage({
        source: providerName,
        type: "update",
        data: data
    });
}

function enterVideo(ev) {
    console.log("enter", ev);
    const ta = $('<textarea/>');
    let audio = {
        id: ev.id.toString(),
        'xesam:url': location.href,
        'xesam:artist': ev.artists.map(a => ta.html(a).text()),
        'xesam:title': ta.html(ev.title).text(),
        'mpris:artUrl': ev.thumb,
        'mpris:length': Math.trunc(ev.duration * 1e6),
        Rate: 1.0,
    };

    // Don't know how to properly handle those; they're optional though
    // audio.LoopStatus = "Track";
    // audio.Shuffle = false;

    if (ev.Volume)
        audio.Volume = ev.Volume;

    audio.CanGoNext = true;
    audio.CanGoPrevious = true;

    reportChange(audio);
}


const COMMANDS = {
    query(attr) {
        console.log("query: ", attr);
        switch (attr) {
        case "Position":
            sendEvent(mprisCommands.GET_POSITION);
            break;
        default:
            console.log(attr);
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
        // TODO: check id
        window.postMessage({type: mprisCommands.SET_POSITION, position: position, direction: "from-content-script"}, "*");
    },

    Rate(what) {

    },

    Volume(volume) {
        window.postMessage({type: mprisCommands.SET_VOLUME, volume: volume, direction: "from-content-script"}, "*");
    },

    Shuffle(yes) {
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
    console.log("update: ", change);
    port.postMessage({
        source: "VK", type: "update", data: change,
    });
}

function quit() {
    port.postMessage({
        source: "VK", type: "quit",
    });
}

window.addEventListener("message", event => {
    // We only accept messages from ourselves
    if (event.source !== window)
        return;

    if (event.data.direction && event.data.direction === "from-page"
            && event.data.namespace === "mpris2") {
        console.log("Content script received message: ", event.data.type);

        switch (event.data.type) {
            case mprisEvents.CONTROLS:
                reportChange(event.data.text);
                break;
            case mprisEvents.UPDATE:
                enterVideo(event.data.text);
                break;
            case mprisEvents.LOADED:
                enterVideo(event.data.text);
                break;
            case mprisEvents.START:
                update({ PlaybackStatus: "Playing" });
                // enterVideo(event.data.text);
                break;
            case mprisEvents.PAUSE:
                update({ PlaybackStatus: "Paused" });
                break;
            case mprisEvents.POSITION:
                console.log("position", event.data.text);
                update({ Position: event.data.text });
                break;
            case mprisEvents.SEEKED:
                update({ seekedTo: event.data.text });
                console.log("position is", event.data.text);
                break;
            default:
                console.log("unknown type", event.data.type);
        }
    }
});

window.addEventListener("load", () => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = chrome.extension.getURL('providers/vk-injected.js');
    script.onload = function() { this.remove(); };
    document.head.appendChild(script);
});
