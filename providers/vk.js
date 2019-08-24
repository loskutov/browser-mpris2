"use strict";
// import { mprisCommands } from './common-constants-module.js'
// ^ ./common-constants.js is meant to be a module, but unfortunately content scripts are loaded without module support

function sendEvent(type) {
    window.postMessage({type: type, namespace: "mpris2", direction: "from-content-script"}, "*");
}

const providerName = "VK";

function enterVideo(ev) {
    console.log("enter", ev);
    const ta = $('<textarea/>');
    let audio = {
        Metadata: {
            'xesam:url': location.href,
            'xesam:artist': ev.artists.map(a => ta.html(a).text()),
            'xesam:title': ta.html(ev.title).text(),
            'mpris:trackid': ev.id.toString(),
            'mpris:artUrl': ev.thumb,
            'mpris:length': Math.trunc(ev.duration * 1e6),
        },
        Rate: 1.0,
        Shuffle: false,
        // PlaybackStatus: 'Paused',
        LoopStatus: 'None',
        CanGoNext: true,
        CanGoPrevious: true,
        Volume: 1,
    };

    // Don't know how to properly handle those; they're optional though
    // audio.LoopStatus = "Track";
    // audio.Shuffle = false;

    if (ev.Volume)
        audio.Volume = ev.Volume;


    update(audio);
}


const COMMANDS = {
    Get(_, attr) {
        console.log("query: ", attr);
        switch (attr) {
            case "Position":
                sendEvent(mprisCommands.GET_POSITION);
                break;
            default:
                console.log(attr);
        }
    },

    Set(_, propName, newValue) {
        console.log("Set", propName, newValue);
        this[propName](newValue);
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
    Previous() {
        sendEvent(mprisCommands.PREV);
    },

    Seek(offset) {
        window.postMessage({type: mprisCommands.SEEK, delta: offset, direction: "from-content-script"}, "*");
    },
    SetPosition({id, position}) {
        // TODO: check id
        window.postMessage({
            type: mprisCommands.SET_POSITION,
            position: position,
            direction: "from-content-script"
        }, "*");
    },

    Rate(what) {

    },

    Volume(volume) {
        console.log("Volume", volume);
        window.postMessage({
            type: mprisCommands.SET_VOLUME,
            namespace: "mpris2",
            volume: volume,
            direction: "from-content-script"
        }, "*");
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
port.onMessage.addListener(cmd => {
    console.log("COMMAND", cmd);
    COMMANDS[cmd.method](...cmd.args);
});

function update(change) {
    console.log("update: ", change);
    port.postMessage({
        source: providerName, type: "changed", args: [change],
    });
}

function quit() {
    port.postMessage({
        source: providerName, type: "quit",
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
                update(event.data.text);
                break;
            case mprisEvents.UPDATE:
                enterVideo(event.data.text);
                break;
            case mprisEvents.LOADED:
                enterVideo(event.data.text);
                break;
            case mprisEvents.START:
                update({PlaybackStatus: "Playing"});
                // enterVideo(event.data.text);
                break;
            case mprisEvents.PAUSED:
                update({PlaybackStatus: "Paused"});
                break;
            case mprisEvents.POSITION:
                console.log("position", event.data.text);
                port.postMessage({source: providerName, type: "return", method: "Get", args: event.data.text,});
                update({position: event.data.text});
                break;
            case mprisEvents.SEEKED:
                update({seekedTo: event.data.text});
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
    script.onload = function () {
        this.remove();
    };
    document.head.appendChild(script);
});
