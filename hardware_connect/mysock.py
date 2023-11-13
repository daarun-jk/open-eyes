import socketio
sio=socketio.Client()
sio.connect('http://13.232.28.46:5000')
@sio.on("routes")
def on_message(data):
	print(data)
	f=open("sock.txt", "w")
	f.write(str(data))
	f.close()
