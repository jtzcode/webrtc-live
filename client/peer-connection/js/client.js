const mediaStreamConstraints = {
    video: true
};

// exchange only video
const offerOptions = {
    offerToReceiveVideo: 1,
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const callButton = document.getElementById("callButton");
const startButton = document.getElementById("startButton");
const hangupButton = document.getElementById("hangupButton");

callButton.disabled = true;
hangupButton.disabled = true;

let localStream;
let remoteStream;
let localPc;
let remotePc;

function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);
    console.log(now, text);
}

function gotLocalMediaStream(mediaStream) {
    localVideo.srcObject = mediaStream;
    localStream = mediaStream;
    trace("Receive local stream");
    callButton.disabled = false;
}

function handleLocalMediaStreamError(error) {
    trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

function gotRemoteMediaStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace("Remote peer connection received stream.");
}

function handleConnection(event) {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
        const newIceCandidate = new RTCIceCandidate(iceCandidate);
        const otherPeer = getOtherPeer(peerConnection);

        otherPeer.addIceCandidate(newIceCandidate).then(() => {
            handleConnectionSuccess(peerConnection);
        }).catch((error) => {
            handleConnectionFailure(peerConnection, error);
        });
    }
    trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
    `${event.candidate}.`);
}

function handleConnectionSuccess(pc) {
    trace(`${getPeerName(pc)} addIceCandidate success.`);
}

function handleConnectionFailure(pc, error) {
    trace(`${getPeerName(pc)} failed to add ICE Candidate:\n`+
        `${error.toString()}.`);
}

function handleConnectionChange(event) {
    const pc = event.target;
    console.log('ICE state change event: ', event);
    trace(`${getPeerName(pc)} ICE state: ` +
            `${pc.iceConnectionState}.`);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
    const peerName = getPeerName(peerConnection);
    trace(`${peerName} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
    setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

function createdOffer(des) {
    localPc.setLocalDescription(des).then(() => {
        setLocalDescriptionSuccess(localPc);
    }).catch(setSessionDescriptionError);

    remotePc.setRemoteDescription(des).then(() => {
        setRemoteDescriptionSuccess(remotePc);
    }).catch(setSessionDescriptionError);

    remotePc.createAnswer().then(createdAnswer).catch(setSessionDescriptionError);
}

function createdAnswer(des) {
    remotePc.setLocalDescription(des).then(() => {
        setLocalDescriptionSuccess(remotePc);
    }).catch(setSessionDescriptionError);

    localPc.setRemoteDescription(des).then(() => {
        setRemoteDescriptionSuccess(localPc);
    }).catch(setSessionDescriptionError);
}

function startAction() {
    startButton.disabled = true;
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
    trace("Requesting local stream");
}

function callAction() {
    callButton.disabled = true;
    hangupButton.disabled = false;

    trace("Starting call...");
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();

    if (videoTracks.length > 0) {
        trace(`Using video device: ${videoTracks[0].label}.`);
    }
    if (audioTracks.length > 0) {
        trace(`Using audio device: ${audioTracks[0].label}.`);
    }

    const servers = null; //RTC Server configurations
    localPc = new RTCPeerConnection(servers);
    localPc.addEventListener('icecandidate', handleConnection);
    localPc.addEventListener('iceconnectionstatechange', handleConnectionChange);

    remotePc = new RTCPeerConnection(servers);
    remotePc.addEventListener('icecandidate', handleConnection);
    remotePc.addEventListener('iceconnectionstatechange', handleConnectionChange);
    remotePc.addEventListener('addstream', gotRemoteMediaStream);

    localPc.addStream(localStream);
    localPc.createOffer(offerOptions).then(createdOffer).catch(setSessionDescriptionError);
}

function hangupAction() {
    localPc.close();
    remotePc.close();
    localPc = null;
    remotePc = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
    trace("Ending call...");
}

startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);

function getOtherPeer(pc) {
    return pc === localPc ? remotePc : localPc;
}

function getPeerName(pc) {
    return (pc === localPc) ?
      'localPeerConnection' : 'remotePeerConnection';
}
