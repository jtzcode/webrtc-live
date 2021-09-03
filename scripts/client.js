'use strict'

const mediaStreamConstraints = {
    video: true
    //audio: true
};

const localVideo = document.querySelector("video");
const deviceList = document.querySelector(".device-list");

navigator.mediaDevices.getUserMedia(mediaStreamConstraints).then((mediaStream) => {
    localVideo.srcObject = mediaStream;
}).catch((error) => {
    console.error("navigator.getUserMedia error: ", error);
});

navigator.mediaDevices.enumerateDevices().then((devices) => {
    devices.forEach(device => {
        console.log("Device id: " + device.deviceId + " Kind: " + device.kind + " Label: " + device.label);
        const item = document.createElement('li');
        item.innerHTML = "Device id: " + device.deviceId + " Kind: " + device.kind + " Label: " + device.label;
        deviceList.appendChild(item);
    });
});