"use strict";
import { attachApi, sendEvent } from './injected-common.js'
import {mprisEvents} from './common-constants-module.js';

(function () {
    function repeatFromString(s) {
        switch (s) {
            case "None":
                return player.REPEAT_NONE;
            case "Track":
                return player.REPEAT_ONE;
            case "Playlist":
                return player.REPEAT_ALL;
            default:
                console.log("Unknown Loop_Status", event.data.how);
                return undefined;
        }
    }

    function repeatToString(r) {
        switch (r) {
            case player.REPEAT_NONE:
                return "None";
            case player.REPEAT_ONE:
                return "Track";
            case player.REPEAT_ALL:
                return "Playlist";
        }
    }

    class Api {
        constructor(player) {

            player.on(player.EVENT_TRACK,    () => {
                const track = player.getCurrentTrack();
                const controls = player.getControls();
                let audio = {
                    id: track.link,
                    'xesam:url': new URL(track.link, location.href).href,
                    'xesam:artist': track.artists.map(a => a.title),
                    'xesam:title': track.title,
                    'mpris:artUrl': "http://" + track.cover.replace("%%", "400x400"),
                    'mpris:length': track.duration * 1e6,
                    Rate: 1.0,
                    LoopStatus: repeatToString(controls.repeat),
                    Shuffle: controls.shuffle === player.CONTROL_ENABLED,
                    Volume: player.getVolume(),
                    CanGoNext: controls.next === player.CONTROL_ENABLED,
                    CanGoPrevious: controls.prev === player.CONTROL_ENABLED,
                };
                sendEvent(mprisEvents.TRACK, audio);
            });
            player.on(player.EVENT_PROGRESS, (() => {
                    let last = -1;
                    return () => {
                        const cur = player.getProgress().position;
                        const diff = Math.abs(last - cur);
                        if (diff > 0.3) {
                            sendEvent(mprisEvents.SEEKED, cur * 1e6);
                        }
                        last = cur;
                    };
                })()
            );
            player.on(player.EVENT_STATE,    () => sendEvent(player.isPlaying() ? mprisEvents.START : mprisEvents.PAUSED));
            player.on(player.EVENT_VOLUME,   () => sendEvent(mprisEvents.CONTROLS, { Volume: player.getVolume() }));
            player.on(player.EVENT_CONTROLS, () => sendEvent(mprisEvents.CONTROLS,
                { LoopStatus: repeatToString(player.getRepeat()), Shuffle: player.getShuffle() }));

            this.player = player;
        }

        play() {
            this.player.togglePause(false);
        }

        pause() {
            this.player.togglePause(true);
        }

        playPause() {
            this.player.togglePause();
        }

        stop() {
            this.player.togglePause(true);
            this.player.setPosition(0);
        }

        next() {
            this.player.next();
        }

        prev() {
            this.player.prev();
        }

        getPosition() {
            return 1e6 * this.player.getProgress().position;
        }

        setPosition(position) {
            this.player.setPosition(position * 1e-6);
        }

        setRepeat(how) {
            this.player.toggleRepeat(repeatFromString(how));
        }

        shuffle(yes) {
            this.player.toggleShuffle(yes);
        }

        setVolume(volume) {
            this.player.setVolume(volume);
        }

    }

    const player = window.externalAPI;
    if (player) {
        attachApi(new Api(player));
    }
})();
