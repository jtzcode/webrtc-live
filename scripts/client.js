'use strict'

const mediaStreamConstraints = {
    video: {
        width: 1280,
        height: 720,
        frameRate: 15,
    },
    audio: false
};

const localVideo = document.querySelector("video");
const deviceList = document.querySelector(".device-list");
const picture = document.getElementById("screen-shot");
const takePhoto = document.getElementById("take-photo");
const savePhoto = document.getElementById("save-photo");

picture.width = 640;
picture.height = 480;

function download(url) {
    var tmpA = document.createElement('a');
    tmpA.download = 'photo';
    tmpA.href = url;
    document.body.appendChild(tmpA);
    tmpA.click();
    tmpA.remove();
}

takePhoto.addEventListener('click', () => {
    picture.getContext('2d').drawImage(localVideo, 0, 0, picture.width, picture.height);
});

savePhoto.addEventListener('click', () => {
    //picture.getContext('2d').drawImage(localVideo, 0, 0, picture.width, picture.height);
    download(picture.toDataURL('image/jpeg'));
});

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