const express = require('express'),
request = require('request'),
app = express(),
mongoose = require('mongoose'),
bodyParser = require('body-parser'),
fs  =   require('fs'),
randomstring = require('randomstring'),
socketIO = require('socket.io'),
microsofComputerVision = require("microsoft-computer-vision");

//*AZURE COMPUTER VISION CONFIG*//
// const filePath = '/home/anurag/Desktop/Hackathon/hackbout/pithole-detection-azure/Positivedata/G0010036.JPG';
const predictionKey = "my key";
const predictionResourceId = "/subscriptions/my token/resourceGroups/AxDu/providers/Microsoft.CognitiveServices/accounts/Pitholedetection-Prediction";
const endpoint = "https://pitholedetection-prediction.cognitiveservices.azure.com/";
const util = require('util');
const PredictionApi = require("@azure/cognitiveservices-customvision-prediction");
const publishIterationName = "Iteration3";
const projectId = PROJECT_ID;
//*CONFIG OVER*//

//express csonfig//
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
// app.use(compression());
// app.use(cookieParser());
app.use(express.static('public'));
app.use(bodyParser.json({limit:'5mb'}));
app.use(bodyParser.urlencoded({limit: '5mb',extended: true}));
app.disable('x-powered-by');
/////////////////

app.get('/',(req, res)=>{
    res.render('index');
});
app.post('/describe',(req, res)=>{
    //console.log(req.body);
    if(req.body.link!=null){
        microsofComputerVision.describeImage({
            "Ocp-Apim-Subscription-Key": "SUBSCRIPTION_KEY",
            "request-origin":"westus2",
            "max-candidates":"1",
            "content-type": "application/json",
            "url": req.body.link
          }).then((result)=>{
            console.log(result)  
            res.send(result.description.captions[0].text);
          }).catch((err)=>{
            console.log(err);
            res.send({'msg':'something went wrong on the server side'});
            //throw err;
          })
    }
});
app.post('/frombase64-describe',(req, res)=>{
  console.log(req.body.base64);
    if(req.body.base64){
        const base64String = req.body.base64; // Not a real image
        // Remove header
        const base64Image = base64String.split(';base64,').pop();
        const file_name = "./images/"+randomstring.generate(8);
        fs.writeFile(file_name, base64Image, {encoding: 'base64'}, function(err) {
            console.log('File created');
            fs.readFile(file_name, function(err, data) {
                if (err) console.log(err);
                console.log(data);
                microsofComputerVision.describeImage({
                    "Ocp-Apim-Subscription-Key": "SUBSCRIPTION_KEY",
                    "request-origin":"westus2",
                    "max-candidates":"1",
                    "content-type": "application/octet-stream",
                    "body": data
                  }).then((result)=>{
                    console.log(result)  
                    res.send(result.description.captions[0].text);
                  }).catch((err)=>{
                    console.log(err);
                    res.send({'msg':'something went wrong on the server side'});
                  });
            });
        });
    }
});
app.post('/detectPithole',(req, res)=>{
  if(req.body.base64){
  const predictor = new PredictionApi.PredictionAPIClient(predictionKey, endpoint);
  const base64String = req.body.base64; // Not a real image
  // Remove header
  const base64Image = base64String.split(';base64,').pop();
  const file_name = "./images/"+randomstring.generate(8);
  fs.writeFile(file_name, base64Image, {encoding: 'base64'}, function(err) {
      console.log('File created');
      getResult(projectId,file_name,predictor,publishIterationName);
      async function getResult(projectId,filePath,predictor,publishIterationName){
        const testFile = fs.readFileSync(filePath);
      
        const results = await predictor.detectImage(projectId,publishIterationName, testFile)
      
        // Show results
        console.log("Results:");
        results.predictions.forEach(predictedResult => {
            if(predictedResult.probability*100.0>60){
              console.log(`\t ${predictedResult.tagName}: ${(predictedResult.probability * 100.0).toFixed(2)}% ${predictedResult.boundingBox.left},${predictedResult.boundingBox.top},${predictedResult.boundingBox.width},${predictedResult.boundingBox.height}`);
            res.send(`\t ${predictedResult.tagName}: ${(predictedResult.probability * 100.0).toFixed(2)}% ${predictedResult.boundingBox.left},${predictedResult.boundingBox.top},${predictedResult.boundingBox.width},${predictedResult.boundingBox.height}`)
            }
        });
      }
  });
  }
  
})
const io =  socketIO.listen(app.listen(3000,(req, res)=>{
    console.log("Server started at http://localhost:3000");
}));
   //SUB SERVER//
//==>SOCKET.IO<==//
io.sockets.on('connection',(socket)=>{
  console.log('connected');
  socket.on('disconnect',socket=>{
    console.log('disconnected');
  });
  socket.on('rpi4-image',(data)=>{
    if(data){
      const base64String = data; // Not a real image
      // Remove header
      const base64Image = base64String.toString().split(';base64,').pop();
      const file_name = "./images/"+randomstring.generate(8);
      fs.writeFile(file_name, base64Image, {encoding: 'base64'}, function(err) {
          console.log('File created');
          fs.readFile(file_name, function(err, data) {
              if (err) console.log(err);
              console.log(data);
              microsofComputerVision.describeImage({
                  "Ocp-Apim-Subscription-Key": "SUBSCRIPTION_KEY",
                  "request-origin":"westus2",
                  "max-candidates":"1",
                  "content-type": "application/octet-stream",
                  "body": data
                }).then((result)=>{
                  console.log(result)  
                  socket.broadcast.emit('get-image-desc',result.description.captions[0].text);
                }).catch((err)=>{
                  console.log(err);
                  socket.broadcast.emit('Fail to describe the given image');
                });
          });
      });
  }
   
  });
  socket.on('rpi4-pithole',(data)=>{
  if(data){
    const predictor = new PredictionApi.PredictionAPIClient(predictionKey, endpoint);
    const base64String = data; // Not a real image
    // Remove header
    const base64Image = base64String.toString().split(';base64,').pop();
    const file_name = "./images/"+randomstring.generate(8);
    fs.writeFile(file_name, base64Image, {encoding: 'base64'}, function(err) {
        console.log('File created');
        getResult(projectId,file_name,predictor,publishIterationName);
        async function getResult(projectId,filePath,predictor,publishIterationName){
          const testFile = fs.readFileSync(filePath);
        
          const results = await predictor.detectImage(projectId,publishIterationName, testFile)
        
          // Show results
          console.log("Results:");
          results.predictions.forEach(predictedResult => {
              if(predictedResult.probability*100.0>60){
                console.log(`\t ${predictedResult.tagName}: ${(predictedResult.probability * 100.0).toFixed(2)}% ${predictedResult.boundingBox.left},${predictedResult.boundingBox.top},${predictedResult.boundingBox.width},${predictedResult.boundingBox.height}`);
              res.send(`\t ${predictedResult.tagName}: ${(predictedResult.probability * 100.0).toFixed(2)}% ${predictedResult.boundingBox.left},${predictedResult.boundingBox.top},${predictedResult.boundingBox.width},${predictedResult.boundingBox.height}`)
              }
          });
        }
    });
    }
   
  });
  socket.on('get-geometry',(data)=>{
    const coords = JSON.parse(data);
    console.log(coords);
    
    const start_lat = coords.start[0].toString();
    const start_long = coords.start[1].toString();
    const stop_lat = coords.stop[0].toString();
    const stop_long = coords.stop[1].toString();

      const licence_key = 'LICENSE_KEY';
    
      const reqURL='https://apis.mapmyindia.com/advancedmaps/v1/'+licence_key+'/route_adv/walking/'+start_lat+','+start_long+';'+stop_lat+','+stop_long+'?with_advices=1&steps=true';
      
      // const reqURL = 'http://apis.mapmyindia.com/advancedmaps/v1/'+ licence_key +'/route?start='+ start +'&destination='+ destination +'&alternatives=true&with_advices=1';
      request(reqURL,(err, response, body)=>{

       const resbody = JSON.parse(response.body); 
       const routes = resbody.routes;
       const geometry = routes[0].geometry;
       const decoded = decode(geometry);

      
      const directions = instructions(resbody).routes; 
      const dir = directions[0];
      // console.log(dir);
       (dir).forEach(direction=>{
    
        if(direction.text.includes('left')){
            //send l via socket
            console.log('l');
            socket.broadcast.emit('routes','l');
        }else if(direction.text.includes('right')){
             // send r via socket
            console.log('r');
            socket.broadcast.emit('routes','r');

        }else if(direction.text.includes('North')||(direction.text.includes('north')||(direction.text.includes('straight')))){
            //send f via socket
            console.log('f');
            socket.broadcast.emit('routes','f');

        }
       });
        function decode(encoded) {
            var points = [],index = 0, len = encoded.length;
            var lat = 0, lng = 0;
            while (index < len) {
                var b, shift = 0, result = 0;
                do {
                    b = encoded.charAt(index++).charCodeAt(0) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
               var dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
                lat += dlat;shift = 0;result = 0;
                do {
                    b = encoded.charAt(index++).charCodeAt(0) - 63;
                    result |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                var dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
                lng += dlng;points.push([lat / 1E5, lng / 1E5])
            }
            return points
        }
        function instructions(data)
    {
        var _0xd813=['sharp-right','uturn','u-turn','sharp\x20left','sharp-left','left','turn-left','slight\x20left','bear-left','round','bearing_after','northeast','east','southeast','south','southwest','west','northwest','Head\x20','use\x20lane','Continue\x20','\x20onto\x20','Enter\x20the\x20roundabout','exit','\x20and\x20take\x20the\x20','\x20exit','\x20turn\x20','turn','Take\x20the\x20ramp\x20on\x20the\x20','replace','slight','merge','toUpperCase','slice','slightly','indexOf','sharp','Take\x20a\x20','Keep\x20','\x20on\x20','Intermediate\x20','destination','charAt','push','location','distance','leaflet-routing-icon-','routes','length','steps','name','maneuver','type','modifier','new\x20name','continue','depart','arrive','reached','roundabout','rotary','fork','on\x20ramp','off\x20ramp','end\x20of\x20road','head','waypointreached','via','destination\x20reached','straight','slight\x20right','bear-right','right','turn-right','sharp\x20right'];(function(_0x5eae1b,_0x235dd8){var _0x486139=function(_0x212f42){while(--_0x212f42){_0x5eae1b['push'](_0x5eae1b['shift']());}};_0x486139(++_0x235dd8);}(_0xd813,0xc5));var _0x58f8=function(_0x24ceac,_0x41a594){_0x24ceac=_0x24ceac-0x0;var _0x3c0b55=_0xd813[_0x24ceac];return _0x3c0b55;};var advise=[''];for(i=0x0;i<data[_0x58f8('0x0')][_0x58f8('0x1')];i++){var route_arr=data[_0x58f8('0x0')][i]['legs'];advise[i]=[];for(var lg=0x0;lg<route_arr[_0x58f8('0x1')];lg++){var leg=route_arr[lg][_0x58f8('0x2')];for(j=0x0;j<leg['length'];j++){var step=leg[j],maneuver='',icon='',road_name=step[_0x58f8('0x3')],type=step[_0x58f8('0x4')][_0x58f8('0x5')],modifier=step[_0x58f8('0x4')][_0x58f8('0x6')],text='';switch(type){case _0x58f8('0x7'):maneuver=_0x58f8('0x8');break;case _0x58f8('0x9'):maneuver='head';break;case _0x58f8('0xa'):maneuver=_0x58f8('0xb');break;case _0x58f8('0xc'):case _0x58f8('0xd'):maneuver=_0x58f8('0xc');break;case'merge':case _0x58f8('0xe'):case _0x58f8('0xf'):case _0x58f8('0x10'):case _0x58f8('0x11'):maneuver=step[_0x58f8('0x4')][_0x58f8('0x5')];break;default:maneuver=step[_0x58f8('0x4')]['modifier'];}switch(maneuver){case _0x58f8('0x12'):if(j===0x0)icon=_0x58f8('0x9');break;case _0x58f8('0x13'):icon=_0x58f8('0x14');break;case _0x58f8('0xc'):icon='enter-roundabout';break;case _0x58f8('0xd'):icon='enter-roundabout';break;case _0x58f8('0x15'):case _0x58f8('0xb'):icon=route_arr[_0x58f8('0x1')]==lg+0x1?_0x58f8('0xa'):_0x58f8('0x14');break;}if(!icon){switch(modifier){case _0x58f8('0x16'):icon='continue';break;case _0x58f8('0x17'):icon=_0x58f8('0x18');break;case _0x58f8('0x19'):icon=_0x58f8('0x1a');break;case _0x58f8('0x1b'):icon=_0x58f8('0x1c');break;case'turn\x20around':case _0x58f8('0x1d'):icon=_0x58f8('0x1e');break;case _0x58f8('0x1f'):icon=_0x58f8('0x20');break;case _0x58f8('0x21'):icon=_0x58f8('0x22');break;case _0x58f8('0x23'):icon=_0x58f8('0x24');break;}}if(type){var dir=Math[_0x58f8('0x25')](step['maneuver'][_0x58f8('0x26')]/0x2d)%0x8;var dd=['north',_0x58f8('0x27'),_0x58f8('0x28'),_0x58f8('0x29'),_0x58f8('0x2a'),_0x58f8('0x2b'),_0x58f8('0x2c'),_0x58f8('0x2d')][dir];if(dd)dir=dd;if(maneuver==_0x58f8('0x12'))text=_0x58f8('0x2e')+dir+(leg[j+0x1][_0x58f8('0x3')]?'\x20on\x20'+leg[j+0x1][_0x58f8('0x3')]:'');else if(maneuver==_0x58f8('0x8')||maneuver==_0x58f8('0x2f'))text=_0x58f8('0x30')+step['maneuver'][_0x58f8('0x6')]+(road_name?_0x58f8('0x31')+road_name:'');else if(maneuver==_0x58f8('0xc'))text=_0x58f8('0x32')+(step[_0x58f8('0x4')][_0x58f8('0x33')]?_0x58f8('0x34')+step[_0x58f8('0x4')]['exit']+_0x58f8('0x35'):'')+(road_name?'\x20onto\x20'+road_name:'');else if(maneuver=='roundabout\x20turn')text='At\x20the\x20roundabout'+(step[_0x58f8('0x4')][_0x58f8('0x6')]?_0x58f8('0x36')+step[_0x58f8('0x4')][_0x58f8('0x6')]:'')+(road_name?_0x58f8('0x31')+road_name:'');else if(maneuver==_0x58f8('0x37')||maneuver=='uturn')text='Make\x20a\x20'+step[_0x58f8('0x4')][_0x58f8('0x6')]+(road_name?_0x58f8('0x31')+road_name:'');else if(maneuver==_0x58f8('0x10')||maneuver==_0x58f8('0xf'))text=_0x58f8('0x38')+step[_0x58f8('0x4')]['modifier'][_0x58f8('0x39')](_0x58f8('0x3a'),'')+(road_name?_0x58f8('0x31')+road_name:'');else if(maneuver=='straight')text='Continue\x20'+step[_0x58f8('0x4')][_0x58f8('0x6')]+(road_name?'\x20onto\x20'+road_name:'');else if(maneuver==_0x58f8('0x21')||maneuver==_0x58f8('0x23')||maneuver==_0x58f8('0x19')||maneuver==_0x58f8('0x1b')||maneuver==_0x58f8('0x3b'))text=type['charAt'](0x0)[_0x58f8('0x3c')]()+type[_0x58f8('0x3d')](0x1)+'\x20'+step['maneuver']['modifier'][_0x58f8('0x39')](_0x58f8('0x3a'),_0x58f8('0x3e'))+(road_name?_0x58f8('0x31')+road_name:'');else if(maneuver==_0x58f8('0xe'))text=(step['maneuver'][_0x58f8('0x6')][_0x58f8('0x3f')](_0x58f8('0x40'))>0x0?_0x58f8('0x41'):_0x58f8('0x42'))+step[_0x58f8('0x4')][_0x58f8('0x6')]['replace'](_0x58f8('0x3a'),'')+'\x20at\x20the\x20fork\x20'+(road_name?_0x58f8('0x31')+road_name:'');else if(maneuver==_0x58f8('0x9'))text=_0x58f8('0x2e')+dir+(road_name?_0x58f8('0x43')+road_name:'');else if(maneuver==_0x58f8('0xb'))text='You\x20have\x20arrived\x20at\x20your\x20'+(route_arr[_0x58f8('0x1')]==lg+0x1?'':_0x58f8('0x44'))+_0x58f8('0x45');else text=step[_0x58f8('0x4')][_0x58f8('0x6')][_0x58f8('0x46')](0x0)['toUpperCase']()+step[_0x58f8('0x4')][_0x58f8('0x6')][_0x58f8('0x3d')](0x1)+(road_name?_0x58f8('0x31')+road_name:'');advise[i][_0x58f8('0x47')]({'text':text,'lat':step[_0x58f8('0x4')]['location'][0x1],'lng':step[_0x58f8('0x4')][_0x58f8('0x48')][0x0],'distance':step[_0x58f8('0x49')],'time':step['duration'],'icon_class':_0x58f8('0x4a')+icon});}}}} return {"routes":advise}
    }
    });
  });
});


