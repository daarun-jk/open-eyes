import base64
import socketio
import requests
from time import sleep
sio=socketio.Client()
sio.connect('http://13.232.28.46:5000')
#while True:
with open("i.png", "rb") as img_file:
    my_string = base64.b64encode(img_file.read())
    print(str(my_string))
     
data=my_string

sleep(2)

# r = requests.post(url = 'http://13.232.28.46:3000/frombase64-describe', data = data) 
# print(r.json())
# with open("my_image.jpg", "rb") as img_file:
#     my_string = base64.b64encode(img_file.read())
# data={'base64':my_string}
#@sio.event
# print(data)
sio.emit('rpi4-pithole',data)
    