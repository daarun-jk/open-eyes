import base64
import socketio
import requests
from time import sleep
import RPi.GPIO as GPIO 
GPIO.setwarnings(False) 
GPIO.setmode(GPIO.BOARD) 
GPIO.setup(10, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
sio=socketio.Client()
sio.connect('http://13.232.28.46:5000')

while True:
    with open("image.png", "rb") as img_file:
        my_string = base64.b64encode(img_file.read())
        print(str(my_string))
     
    data=my_string

    sleep(0.5)

# r = requests.post(url = 'http://13.232.28.46:3000/frombase64-describe', data = data) 
# print(r.json())
# with open("my_image.jpg", "rb") as img_file:
#     my_string = base64.b64encode(img_file.read())
# data={'base64':my_string}
#@sio.event
# print(data)
    if GPIO.input(10) == GPIO.HIGH:
        print("Button was pushed!")
        sio.emit('rpi4-image',data)
        
    else:
        print("not pushed") 
 
    