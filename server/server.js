const static = require('node-static');
const http = require('http');
const file = new(static.Server)();

const app = http.createServer(function(req, res){
    file.serve(req, res);
}).listen(2013);
var socketIo = require('socket.io');

const io = socketIo(app);

io.sockets.on('connection', (socket) => {
    console.log("On connection");
    function log() {
        const arr = ['>>> Log message from server: '];
        for (var i = 0; i < arguments.length; i++) {
            arr.push(arguments[i]);
        }
        socket.emit('log', arr);
    }

    socket.on('message', (room, data)=>{
		log('message, room: ' + room + ", data, type:" + data.type);
		socket.to(room).emit('message',room, data);
	});

	/*
	socket.on('message', (room)=>{
		logger.debug('message, room: ' + room );
		socket.to(room).emit('message',room);
	});
	*/

	socket.on('join', (room)=>{
		socket.join(room);
		var myRoom = io.sockets.adapter.rooms.get(room);
		var users = (myRoom)? myRoom.size : 0;
		log('the user number of room (' + room + ') is: ' + users);

		if(users < 4){
			socket.emit('joined', room, socket.id); //发给除自己之外的房间内的所有人
			if(users > 1){
				socket.to(room).emit('otherjoin', room, socket.id);
			}
		
		}else{
			socket.leave(room);	
			socket.emit('full', room, socket.id);
		}
		//socket.emit('joined', room, socket.id); //发给自己
		//socket.broadcast.emit('joined', room, socket.id); //发给除自己之外的这个节点上的所有人
		//io.in(room).emit('joined', room, socket.id); //发给房间内的所有人
	});

	socket.on('leave', (room)=>{

		socket.leave(room);

		var myRoom = io.sockets.adapter.rooms[room]; 
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		log('the user number of room is: ' + users);

		//socket.emit('leaved', room, socket.id);
		//socket.broadcast.emit('leaved', room, socket.id);
		socket.to(room).emit('bye', room, socket.id);
		socket.emit('leaved', room, socket.id);
		//io.in(room).emit('leaved', room, socket.id);
	});
});