'use strict'

const mediaStreamConstraints = {
    video: true,
    audio: true
};

const localVideo = document.querySelector("video");

navigator.mediaDevices.getUserMedia(mediaStreamConstraints).then((mediaStream) => {
    localVideo.srcObject = mediaStream;
}).catch((error) => {
    console.error("navigator.getUserMedia error: ", error);
});