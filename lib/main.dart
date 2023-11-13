import 'dart:core';
// import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:speech_recognition/speech_recognition.dart';
// import 'package:flutter_socket_io/flutter_socket_io.dart';
// import 'package:flutter_socket_io/socket_io_manager.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_tts/flutter_tts.dart';
import 'package:geolocator/geolocator.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:adhara_socket_io/adhara_socket_io.dart';
import 'package:flutter_sms/flutter_sms.dart';
import 'package:flutter_sms/flutter_sms_platform.dart';
import 'package:vibration/vibration.dart';

void main() => runApp(MyApp());

const String uri = 'http://13.232.28.46:5000/';

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  SpeechRecognition _speechRecognization;
  bool _islistening = false;
  bool _isavailable = false;
  String resulttext = "";
  bool speakin = false;
  List<String> split;
  // SocketIO socketIO;
  final FlutterTts _flutterTts = FlutterTts();
  SocketIOManager manager;
  FlutterSmsPlatform flutterSmsPlatform = FlutterSmsPlatform();
  List<String> people = ['7483054109'];
  SocketIO socket;
  double currentlat = 25.343433; //13.1278059;
  double currentlong = 50.3423423; //77.5880203;
  String alert =
      "I am stuck in this location:\nlatitude: 13.1278059\nlongitude: 77.5880203";

  @override
  void initState() {
    // TODO: implement initState
    // socketIO = SocketIOManager().createSocketIO(
    //   'http://13.232.28.46:3000',
    //   ''
    // );
    // socketIO.init();
    // socketIO.subscribe('some-info', (jsonData) {
    //   //Convert the JSON data received into a Map
    //   Map<String, dynamic> data = json.decode(jsonData);
    //   print(data['msg']);
    // });
    // socketIO.connect();
    // socketIO.sendMessage("connection", "hello my name is sajan");
    // socketIO.sendMessage("from-client", "hi i am sajan conecting");
    _getLocation().then((position) {
      setState(() {
        currentlat = position.latitude;
        currentlong = position.longitude;
        alert =
            "I am stuck in this location:\nlatitude: ${currentlat}\nlongitude: ${currentlong}";
      });
    });
    initSocket();
    super.initState();
    manager = SocketIOManager();
    _speechRecognization = SpeechRecognition();
    _speechRecognization.setAvailabilityHandler(
        (bool res) => setState(() => _isavailable = res));
    _speechRecognization.setRecognitionStartedHandler(
        () => setState(() => _islistening = true));
    _speechRecognization.setRecognitionResultHandler(
        (String speech) => setState(() => resulttext = speech));
    _speechRecognization.setRecognitionCompleteHandler(
        () => setState(() => _islistening = false));
    _speechRecognization
        .activate()
        .then((res) => setState(() => _isavailable = res));
  }

  initSocket() async {
    socket = await SocketIOManager().createInstance(SocketOptions(uri));
    socket.onConnect((data) {
      print("conected");
      print(data);
      socket.emit("from-client", [
        "hi from sajan",
        123,
        {"message": "sala"}
      ]);
    });
    socket.on('some-info', (data) {
      print(data);
    });
    socket.on('get-image-desc', (data) {
      texttovoice(data);
    });
    socket.on('piholes', (data) {
      texttovoice(data);
    });

    socket.connect();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Center(child: Text("open eyes")),
        elevation: 20,
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          Expanded(
            child: Container(
              margin: EdgeInsets.only(top: 10, left: 10, right: 10),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.blueAccent),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text("$resulttext"),
              ),
            ),
          ),
          Container(
            height: MediaQuery.of(context).size.width,
            margin: EdgeInsets.symmetric(
                vertical: MediaQuery.of(context).size.width * 0.05),
            child: IconButton(
              iconSize: MediaQuery.of(context).size.width * 0.98,
              icon: Icon(
                Icons.play_circle_outline,
                color: (speakin) ? Colors.green : Colors.blue,
                size: MediaQuery.of(context).size.width * 0.98,
              ),
              onPressed: () {
                vibrate();
                if (!speakin) {
                  if (_isavailable && !_islistening)
                    _speechRecognization
                        .listen(locale: "en_US")
                        .then((result) => print('$result'));
                } else {
                  if (resulttext.toLowerCase() == 'sos') {
                    smssend(alert, people);
                  } else {
                    if (resulttext.contains("get me to")) {
                      split = resulttext.split("get me to");
                    } else if (resulttext.contains("guide me to")) {
                      split = resulttext.split("guide me to");
                    }
                    fetchlocation(split[1]);
                  }
                  if (_islistening) {
                    _speechRecognization.stop().then((result) {
                      setState(() => _islistening = result);
                    });

                    _speechRecognization.cancel().then((result) {
                      print("object");
                      setState(() => _islistening = result);
                    });
                  }
                }
                setState(() {
                  speakin = !speakin;
                });
              },
            ),
          ),
          FloatingActionButton(
            child: Text("data"),
            onPressed: () {
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) =>
                          Mapview(12.971599, 77.594566, socket)));
            },
          ),
          // RaisedButton(
          //   child: Text("press here for voice"),
          //   onPressed: null,
          // )
        ],
      ),
    );
  }

  void fetchlocation(String address) async {
    try {
      http.Response response = await http.get(
          'https://atlas.mapmyindia.com/api/places/search/json?query=${Uri.encodeComponent(address)}&access_token=1a5dd1f8-df45-40ce-8a4f-ef1d9dc9c731');
      if (response.statusCode == 200 || response.statusCode == 201) {
        // final String res = response.body;
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => Mapview(
                jsonDecode(response.body)['suggestedLocations'][0]['latitude'],
                jsonDecode(response.body)['suggestedLocations'][0]['longitude'],
                socket),
          ),
        );
        print(response.body);
      }
    } catch (error) {
      print(error);
    }
  }

  Future texttovoice(String text) async {
    await _flutterTts.setLanguage("en-US");
    await _flutterTts.setPitch(1);
    await _flutterTts.setVolume(1);
    // print(await _flutterTts.getVoices);
    await _flutterTts.speak(text);
  }

  void smssend(String alert, List<String> people) async {
    String res = await flutterSmsPlatform
        .sendSMS(message: alert, recipients: people)
        .catchError((onError) {
      print(onError);
    });
    print(res);
  }

  void vibrate() async {
    if (await Vibration.hasVibrator()) {
      Vibration.vibrate();
    }
  }

  Future<Position> _getLocation() async {
    var currentLocation;
    try {
      currentLocation = await Geolocator()
          .getCurrentPosition(desiredAccuracy: LocationAccuracy.best);
    } catch (e) {
      print("Error : ${e}");
      // currentLocation = null;
    }
    return currentLocation;
  }
}

class Mapview extends StatefulWidget {
  double deslatitude;
  double deslongitude;
  SocketIO socketd;

  Mapview([double latitude, double longitude, SocketIO socket]) {
    deslatitude = latitude;
    deslongitude = longitude;
    socketd = socket;
  }

  @override
  _MapviewState createState() => _MapviewState();
}

class _MapviewState extends State<Mapview> {
  double currentlat = 60.2313;//13.1278059;
  double currentlong =90.38402;//77.5880203;
  var points = <LatLng>[];
  List<dynamic> value;
  var pt = <LatLng>[
    LatLng(36.08708, 72.54032),
    LatLng(36.08708, 72.54032),
  ];

  void initState() {
    // TODO: implement initState
    _getLocation().then((position) {
      // widget.socketd.emit('get-geometry', [
      //   {
      //     "start": [currentlat, currentlong],
      //     "stop": [widget.deslatitude, widget.deslongitude],
      //   }
      // ]);
      // widget.socketd.on("polylines", (data) {
      //   print(data);
      //   print(data.runtimeType);
      //   value = data;
      //   print(value.length);
      //   setState(() {
      //     for (int i = 0; i < value.length; i++) {
      //       points.add(LatLng(value[i][0], value[i][1]));
      //     }
      //     print(points);
      //   });
      // });
      setState(() {
        currentlat = position.latitude;
        currentlong = position.longitude;
        pt = [
          LatLng(currentlat, currentlong),
          LatLng(widget.deslatitude, widget.deslongitude)
        ];
      });
      initSocket();
      print(position);
    });
    super.initState();
  }

  initSocket() async {
    widget.socketd = await SocketIOManager().createInstance(SocketOptions(uri));
    widget.socketd.onConnect((data) {
      print("conected");
      print(data);
      // widget.socketd.emit("from-client", [
      //   "hi from sajan",
      //   123,
      //   {"message": "sala"}
      // ]);
    });
    widget.socketd.emit('get-geometry', [
      {
        "start": [currentlat, currentlong],
        "stop": [widget.deslatitude, widget.deslongitude],
      }
    ]);
    widget.socketd.on("polylines", (data) {
      print(data);
      print(data.runtimeType);
      value = data;
      print(value.length);
      setState(() {
        for (int i = 0; i < value.length; i++) {
          points.add(LatLng(value[i][0], value[i][1]));
        }
        print(points);
      });
    });
    widget.socketd.connect();
  }

  @override
  Widget build(BuildContext context) {
    // TODO: implement build
    return Scaffold(
      body: FlutterMap(
        options: MapOptions(
          center: LatLng(widget.deslatitude, widget.deslongitude),
          zoom: 15,
        ),
        layers: [
          new TileLayerOptions(
            // urlTemplate: ""https://mt1.mapmyindia.com/advancedmaps/v1/<licence key>/still_map/{z}/{x}/{y}.png", attribution = 'MapmyIndia'",
            urlTemplate:
                "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}@2x.png?access_token={accessToken}",
            additionalOptions: {
              'accessToken':
                  'pk.eyJ1Ijoic2FqYW4tcG91ZGVsIiwiYSI6ImNrMnZnbGw3ZTA0aTgzbG5xcTNpMDFzbHAifQ.Criu5-m3kWFRKo7vcZ3NYA',
              'id': 'mapbox.streets',
            },
          ),
          new PolylineLayerOptions(
            polylines: [
              Polyline(
                points: pt,
                borderStrokeWidth: 1,
                strokeWidth: 1,
                color: Colors.purple,
              ),
            ],
          ),
          new MarkerLayerOptions(
            markers: [
              new Marker(
                width: 300.0,
                height: 300.0,
                point: new LatLng(currentlat, currentlong),
                builder: (ctx) => new Container(
                  child: Icon(
                    Icons.location_on,
                    color: Colors.green,
                  ),
                ),
              ),
              new Marker(
                width: 300.0,
                height: 300.0,
                point: new LatLng(widget.deslatitude, widget.deslongitude),
                builder: (ctx) => new Container(
                  child: Icon(
                    FontAwesomeIcons.mapPin,
                    color: Colors.red,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<Position> _getLocation() async {
    var currentLocation;
    try {
      currentLocation = await Geolocator()
          .getCurrentPosition(desiredAccuracy: LocationAccuracy.best);
    } catch (e) {
      print("Error : ${e}");
      // currentLocation = null;
    }
    return currentLocation;
  }
}
