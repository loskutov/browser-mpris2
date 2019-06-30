import { mprisCommands, mprisEvents } from './common-constants-module.js'
export function sendEvent(type, ev) {
    console.log("sending event", type, ev);
    window.postMessage({type: type, direction: "from-page", namespace: "mpris2", text: ev}, "*");
}

export function attachApi(api) {
    const handlers = (() => {
        let res = [];
        res[mprisCommands.PLAY]         = () => api.play();
        res[mprisCommands.PAUSE]        = () => api.pause();
        res[mprisCommands.PLAYPAUSE]    = () => api.playPause();
        res[mprisCommands.STOP]         = () => api.stop();
        res[mprisCommands.NEXT]         = () => api.next();
        res[mprisCommands.PREV]         = () => api.prev();
        res[mprisCommands.GET_POSITION] = () => sendEvent(mprisEvents.POSITION, api.getPosition());
        res[mprisCommands.SEEK]         = () => api.setPosition(api.getPosition() + event.data.delta);
        res[mprisCommands.SET_VOLUME]   = () => api.setVolume(event.data.volume);
        res[mprisCommands.SET_POSITION] = () => api.setPosition(event.data.position);
        res[mprisCommands.SET_REPEAT]   = () => api.setRepeat(event.data.how);
        res[mprisCommands.SHUFFLE]      = () => api.shuffle(event.data.yes);
        return res;
    })();
    window.addEventListener("message", event => {
        if (event.source !== window)
            return;

        if (event.data.direction && event.data.direction === "from-content-script"
            && event.data.namespace === "mpris2") {
            handlers[event.data.type]();
        }
    });
}

