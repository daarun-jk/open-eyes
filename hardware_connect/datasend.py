import cv2
import base64
import socketio
import requests
import numpy

from time import sleep
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_BUFFERSIZE,1)
while(True):
    ret, frame=cap.read()
    cv2.imwrite('image.png',frame)
    sleep(0.1)
    cv2.imshow('frame',frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
    sleep(1)

cap.release()
cv2.destroyAllWindows()        