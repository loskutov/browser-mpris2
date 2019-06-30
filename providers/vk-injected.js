"use strict";

import { attachApi, sendEvent } from './injected-common.js'
import {mprisEvents} from "./common-constants-module.js";

(function () {

    console.log("executing injected code");

    class Api {
        constructor(player) {
            function getCurrentAudio() {
                const audio = player.getCurrentAudio();
                if (!audio) {
                    return audio;
                }
                let obj = {
                    id: audio[AudioUtils.AUDIO_ITEM_INDEX_ID],
                    artists: [],
                    title: audio[AudioUtils.AUDIO_ITEM_INDEX_TITLE],
                    thumb: null,
                    duration: audio[AudioUtils.AUDIO_ITEM_INDEX_DURATION],
                };
                const mainArtists = audio[AudioUtils.AUDIO_ITEM_INDEX_MAIN_ARTISTS];
                if (isArray(mainArtists)) {
                    obj.artists = mainArtists.map(a => a.name);
                }
                const featArtists = audio[AudioUtils.AUDIO_ITEM_INDEX_FEAT_ARTISTS];
                if (isArray(featArtists)) {
                    obj.artists = obj.artists.concat(featArtists.map(a => a.name));
                }
                if (obj.artists.length === 0) {
                    obj.artists = [audio[AudioUtils.AUDIO_ITEM_INDEX_PERFORMER]];
                }
                const covers = audio[AudioUtils.AUDIO_ITEM_INDEX_COVER_URL];
                if (covers) {
                    obj.thumb = covers.split(',')[1];
                }
                return obj;
            }
            const a = getCurrentAudio();
            const playerAdapter = player.stats.playerAdapter;
            if (a) {
                a.Volume = playerAdapter.getVolume() / 100;
                sendEvent(mprisEvents.LOADED, a);
            }
            playerAdapter.listenPlay(() => sendEvent(mprisEvents.START));
            playerAdapter.listenPause(() => sendEvent(mprisEvents.PAUSE));
            playerAdapter.listenEnded(() => sendEvent(mprisEvents.ENDED));
            playerAdapter.listenVolume(() => sendEvent(mprisEvents.CONTROLS, { Volume: playerAdapter.getVolume() / 100 }));
            playerAdapter.listen("update", () => sendEvent(mprisEvents.UPDATE, getCurrentAudio()));
            playerAdapter.listenSeek(() => window.postMessage({type: mprisEvents.SEEKED, direction: "from-page", Position: this.getPosition()}, "*"));
            this.player = player;
        }

        play() {
            this.player.play();
        }

        pause() {
            this.player.pause();
        }

        stop() {
            this.player.stop();
        }

        playPause() {
            if (this.player.isPlaying()) {
                this.player.pause();
            } else {
                this.player.play();
            }
        }

        next() {
            this.player.playNext();
        }

        prev() {
            this.player.playPrev();
        }

        getPosition() {
            const duration = this.player.getCurrentAudio()[AudioUtils.AUDIO_ITEM_INDEX_DURATION];
            return Math.trunc(this.player.getCurrentProgress() * duration * 1e6);
        }

        setPosition(position) {
            const duration = this.player.getCurrentAudio()[AudioUtils.AUDIO_ITEM_INDEX_DURATION];
            let progress = position / 1e6 / duration;
            progress = Math.max(0, Math.min(1, progress));
            this.player.seek(progress);
        }

        setVolume(volume) {
            this.player.setVolume(Api._volumeToInternal(volume));
        }

        static _volumeToInternal(volume) {
            const base = Slider.LOGFBASE;
            return (Math.pow(base, volume) - 1) / (base - 1);
        }

    }


    const player = window.getAudioPlayer();
    if (player) {
        attachApi(new Api(player));
    }
})();
