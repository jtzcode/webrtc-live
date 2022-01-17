'use strict'

var btnConn =  document.querySelector('button#connserver');
var btnLeave = document.querySelector('button#leave');


var chat = document.querySelector('textarea#chat');
var send_txt = document.querySelector('textarea#sendtxt');
var btnSend = document.querySelector('button#send');
var btnSendFile = document.querySelector('button#sendFile');

var pcConfig = {
  'iceServers': [{
    'urls': 'turn:stun.al.learningrtc.cn:3478',
    'credential': "mypasswd",
    'username': "garrylea"
  }]
};


var pc = null;
var dc = null;
var dcFile = null;

var roomid;
var socket = null;

var offerdesc = null;
var state = 'init';

var sentFile = {};
var receivedFile = {};
var downloadAnchor = document.querySelector('a#download');
var fileInput = document.querySelector('input#select-file');
var fileReader = null;

function sendMessage(roomid, data){

	console.log('send message to other end', roomid, data);
	if(!socket){
		console.log('socket is null');
	}
	socket.emit('message', roomid, data);
}

//
function receivemsg(e){
	var msg = e.data;
	if(msg){
		chat.value += '-> ' + msg + '\r\n'; 	
	}else{
		console.error('received msg is null');	
	}
}

var fileBuffer = [];
var receiveSize = 0;

function receiveFile(event) {
    fileBuffer.push(event.data);
    receiveSize += event.data.byteLength;

    if (receiveSize === receivedFile.size) {
        var received = new Blob(fileBuffer, {type: 'application/octet-stream'});
        fileBuffer = [];
        receiveSize = 0;
        downloadAnchor.href = URL.createObjectURL(received);
        downloadAnchor.download = receivedFile.name;
        downloadAnchor.textContent = `Click to download ${receivedFile.name}: (${receivedFile.size} bytes)`;
        downloadAnchor.style.display = 'block';
    }
}

function sendFileData(){
    var offset = 0; //偏移量
    var chunkSize = 16384; //每次传输的块大小
    var file = fileInput.files[0]; //要传输的文件，它是通过HTML中的file获取的

    //向信令服务器发送消息
    sendMessage(roomid, 
        {
            //将文件信息以 JSON 格式发磅
            type: 'fileinfo',
            name: file.name,
            size: file.size,
            filetype: file.type,
            lastmodify: file.lastModified
        }
    );
    //创建fileReader来读取文件
    fileReader = new FileReader();
    fileReader.onload = e => { //当数据被加载时触发该事件
        dcFile.send(e.target.result); //发送数据
        offset += e.target.result.byteLength; //更改已读数据的偏移量
        if (offset < file.size) { //如果文件没有被读完
            readSlice(offset); // 读取数据
        }
    }

    var readSlice = o => {
        const slice = file.slice(offset, o + chunkSize); //计算数据位置
        fileReader.readAsArrayBuffer(slice); //读取 16K 数据
    };

    readSlice(0); //开始读取数据
}

function dataChannelStateChange(){
	var msgReadyState, fileReadyState;
	if (dc) {
		msgReadyState = dc.readyState;
	}
	if (dcFile) {
		fileReadyState = dcFile.readyState;
	}

	if(msgReadyState === 'open'){
		send_txt.disabled = false;
		send.disabled = false;
	}else{
		send_txt.disabled = true;
		send.disabled =true;
	}

	if(fileReadyState === 'open'){
		fileInput.disabled = false;
		btnSendFile.disabled = false;
	}else{
		fileInput.disabled = true;
		btnSendFile.disabled =true;
	}
}

function conn(){

	socket = io.connect();

	socket.on('joined', (roomid, id) => {
		console.log('receive joined message!', roomid, id);
		state = 'joined'

		//如果是多人的话，第一个人不该在这里创建peerConnection
		//都等到收到一个otherjoin时再创建
		//所以，在这个消息里应该带当前房间的用户数
		//
		//create conn and bind media track
		createPeerConnection();

		btnConn.disabled = true;
		btnLeave.disabled = false;
        chat.disabled = false;
        send.disabled = false;

		console.log('receive joined message, state=', state);
	});

	socket.on('otherjoin', (roomid) => {
		console.log('receive joined message:', roomid, state);

		//如果是多人的话，每上来一个人都要创建一个新的 peerConnection
		//
		if(state === 'joined_unbind'){
			createPeerConnection();
		}

		//
        var options = {
            ordered: true,
            maxReTransmits: 10
        };
	 	dc = pc.createDataChannel('chat', options);	
		dc.onmessage = receivemsg;
		dc.onopen = dataChannelStateChange;
		dc.onclose = dataChannelStateChange;

		dcFile = pc.createDataChannel('file', options);
		dcFile.onmessage = receiveFile;
		dcFile.onopen = dataChannelStateChange;
		dcFile.onclose = dataChannelStateChange;

		state = 'joined_conn';
		call();

		console.log('receive other_join message, state=', state);
	});

	socket.on('full', (roomid, id) => {
		console.log('receive full message', roomid, id);
		socket.disconnect();
		hangup();
		state = 'leaved';
		console.log('receive full message, state=', state);
		alert('the room is full!');
	});

	socket.on('leaved', (roomid, id) => {
		console.log('receive leaved message', roomid, id);
		state='leaved'
		socket.disconnect();
		console.log('receive leaved message, state=', state);

		btnConn.disabled = false;
		btnLeave.disabled = true;
	});

	socket.on('bye', (room, id) => {
		console.log('receive bye message', roomid, id);
		//state = 'created';
		//当是多人通话时，应该带上当前房间的用户数
		//如果当前房间用户不小于 2, 则不用修改状态
		//并且，关闭的应该是对应用户的peerconnection
		//在客户端应该维护一张peerconnection表，它是
		//一个key:value的格式，key=userid, value=peerconnection
		state = 'joined_unbind';
		hangup();
		console.log('receive bye message, state=', state);
	});

	socket.on('disconnect', (socket) => {
		console.log('receive disconnect message!', roomid);
		if(!(state === 'leaved')){
			hangup();
		}
		state = 'leaved';

		btnConn.disabled = false;
		btnLeave.disabled = true;
	
	});

	socket.on('message', (roomid, data) => {
		console.log('receive message!', roomid, data);

		if(data === null || data === undefined){
			console.error('the message is invalid!');
			return;	
		}

		if(data.hasOwnProperty('type') && data.type === 'offer') {
			
			pc.setRemoteDescription(new RTCSessionDescription(data));
			//create answer
			pc.createAnswer()
				.then(getAnswer)
				.catch(handleAnswerError);

		}else if(data.hasOwnProperty('type') && data.type === 'answer'){
			pc.setRemoteDescription(new RTCSessionDescription(data));
		
		}else if (data.hasOwnProperty('type') && data.type === 'candidate'){
			var candidate = new RTCIceCandidate({
				sdpMLineIndex: data.label,
				candidate: data.candidate
			});
			pc.addIceCandidate(candidate)
				.then(()=>{
					console.log('Successed to add ice candidate');	
				})
				.catch(err=>{
					console.error(err);	
				});
		
		} else if (data.hasOwnProperty('type') && data.type === 'fileinfo') {
            receivedFile.name = data.name;
            receivedFile.size = data.size;
            receivedFile.filetype = data.filetype;
            receivedFile.lastmodify = data.lastmodify;
        } else{
			console.log('the message is invalid!', data);
		
		}
	
	});


	roomid = '54188'; 
	socket.emit('join', roomid);

	return true;
}

function connSignalServer(){
	
	//setup connection
	conn();

	return true;
}

function getMediaStream(stream){

	localStream = stream;	
	localVideo.srcObject = localStream;

	//这个函数的位置特别重要，
	//一定要放到getMediaStream之后再调用
	//否则就会出现绑定失败的情况
	

	bitrateSeries = new TimelineDataSeries();
	bitrateGraph = new TimelineGraphView('bitrateGraph', 'bitrateCanvas');
	bitrateGraph.updateEndDate();

	packetSeries = new TimelineDataSeries();
	packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
	packetGraph.updateEndDate();
}

function getDeskStream(stream){
	localStream = stream;
}

function handleError(err){
	console.error('Failed to get Media Stream!', err);
}

function shareDesk(){

	if(IsPC()){
		navigator.mediaDevices.getDisplayMedia({video: true})
			.then(getDeskStream)
			.catch(handleError);

		return true;
	}

	return false;

}

function handleOfferError(err){
	console.error('Failed to create offer:', err);
}

function handleAnswerError(err){
	console.error('Failed to create answer:', err);
}

function getAnswer(desc){
	pc.setLocalDescription(desc);

	//send answer sdp
	sendMessage(roomid, desc);
}

function getOffer(desc){
	pc.setLocalDescription(desc);
	offerdesc = desc;

	//send offer sdp
	sendMessage(roomid, offerdesc);	

}

//
//

function createPeerConnection(){

	//如果是多人的话，在这里要创建一个新的连接.
	//新创建好的要放到一个map表中。
	//key=userid, value=peerconnection
	console.log('create RTCPeerConnection!');
	if(!pc){
		pc = new RTCPeerConnection(pcConfig);

		pc.onicecandidate = (e)=>{

			if(e.candidate) {
				sendMessage(roomid, {
					type: 'candidate',
					label:event.candidate.sdpMLineIndex, 
					id:event.candidate.sdpMid, 
					candidate: event.candidate.candidate
				});
			}else{
				console.log('this is the end candidate');
			}
		}

		//
		pc.ondatachannel = e => {
			if(!dc && e.channel.label == "chat"){
				dc = e.channel;	
				dc.onmessage = receivemsg;
				dc.onopen = dataChannelStateChange;
				dc.opclose = dataChannelStateChange;
			}
			if(!dcFile && e.channel.label == "file"){
				dcFile = e.channel;	
				dcFile.onmessage = receiveFile;
				dcFile.onopen = dataChannelStateChange;
				dcFile.opclose = dataChannelStateChange;
			}
		}	

	}else {
		console.log('the pc have be created!');
	}

	return;	
}

function call(){
	
	if(state === 'joined_conn'){

    /*
		var offerOptions = {
			offerToRecieveAudio: 1,
			offerToRecieveVideo: 1
		}
    */

		pc.createOffer()
			.then(getOffer)
			.catch(handleOfferError);
	}
}

function hangup(){

	if(!pc) {
		return;
	}

	offerdesc = null;
	
	pc.close();
	pc = null;

}

function leave() {

	socket.emit('leave', roomid); //notify server

	hangup();

	btnConn.disabled = false;
	btnLeave.disabled = true;

}

//
function sendText(){
	var data = send_txt.value;
	if(data){
		dc.send(data);
	}

	send_txt.value = '';
	chat.value += '<-' + data + '\r\n';
}

btnConn.onclick = connSignalServer
btnLeave.onclick = leave;

btnSend.onclick = sendText;
btnSendFile.onclick = sendFileData;