import './App.scss';
import React, { useState,useEffect,useRef} from "react";
import { MapContainer, TileLayer,Marker, Popup,useMapEvent,useMap   } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from 'leaflet'
import "leaflet/dist/leaflet.css";
import * as signalR from "@microsoft/signalr";
import mqtt from 'mqtt';
import ChangeName from './ChangeName';
import axios from 'axios';
import { ToastContainer } from 'react-toastify';
import { CiMap } from "react-icons/ci";
import { RxDashboard } from "react-icons/rx";
import { FaDatabase } from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import { SlArrowDown } from "react-icons/sl";
import { SlArrowUp } from "react-icons/sl";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import { data } from 'autoprefixer';
import { FaBatteryHalf } from "react-icons/fa6";
import useGeoLocation from "./useGeoLocation"
import ListDataLogger from './ListDataLogger';
import { IoMenu } from "react-icons/io5";
function App() {
// const isInitialRender = useRef(true);
  const locationUser = useGeoLocation(); // lấy vị trí của người thay pin
  const [intervalId, setIntervalId] = useState(null); // mô phỏng chuyển động GPS Tracker
  const [showModalChangeName, setshowModalChangeName] = useState(false); // hiển thị bảng đổi tên
  const [ZOOM_LEVEL,setZOOM_LEVEL] = useState(13); // độ zoom map
  const [datalogger,setDatalogger] = useState({lat:  10.772785, lng : 106.659763, line:[]}) // con datalogger giám sát thực
  const [center, setCenter] = useState({ lat: 10.770834441565942, lng : 106.6731350560201 }); // center
  const mapRef = useRef();
  const [timeStamp, settimeStamp] = useState(''); // thời gian IOT gửi lên
  const [nameDataLogger, setNameDataLogger] = useState(''); // tên dataLogger
  const [showTableWarning, setshowTableWarning] = useState(false); // hiển thị những địa điểm bị trộm
  const [isWarning, setisWarning] = useState(false); // tín hiệu bị trộm
  const [isDisplayRouteGPS, setisDisplayRouteGPS] = useState(false); // hiển thị đường đi GPS Tracker
  const [beginPosition, setbeginPosition] = useState({}); //vị trí ban đầu 
  const [moving, setMoving] = useState(false); // tín hiệu di chuyển
  const [showPercentBattery, setshowPercentBattery] = useState(false);  // hiển thị bảng thay pin
  const [selectPercentBattery, setselectPercentBattery] = useState(null); // chọn mức pin cần thay
  const [positionUser, setpositionUser] = useState({ lat: "", lng: "" }); //vị trí của người thay pin
  const [isShowPositionUser, setIsShowPositionUser] = useState(false); // hiển thị vị trí người thay pin
  const [listLoggerBattery,setlistLoggerBattery] = useState([]) // danh sách Logger cần thay pin
  const [displayNavigation,setdisplayNavigation] = useState(false)
  const ListBatteryPercent = [50,40,30,20,10]  // các mức pin cần thay

  const wakeup = new L.Icon({ // marker bình thường
    iconUrl: require("./asset/images/position.png" ),
    iconSize: [40,52],
    iconAnchor: [17, 49],     // nhỏ thì sang phải, xuống  
    popupAnchor: [3, -45],   // nhỏ thì sang trái  
  })

  const warning = new L.Icon({  // marker bị trộm
    iconUrl: require("./asset/images/warning.png" ),
    iconSize: [50,55],
    iconAnchor: [28, 50],    // nhỏ thì sang phải, xuống       
    popupAnchor: [0, -45], 
  })

  const positionWarning = new L.Icon({ // vị trí GPS khi bị trộm đi qua
    iconUrl: require("./asset/images/positionWarning.png" ),
    iconSize: [60,60],
    iconAnchor: [28, 50],// nhỏ thì sang phải, xuống  
    popupAnchor: [3, -40], 
  })

  const user = new L.Icon({  // vị trí người thay pin
    iconUrl: require("./asset/images/maker_user.png" ),
    iconSize: [60,60],
    iconAnchor: [25, 50],
    popupAnchor: [6, -40], 
  })

  const battery = new L.Icon({  // vị trí những DataLogger có mức pin cần thay
    iconUrl: require("./asset/images/battery.png" ),
    iconSize: [65,60],
    iconAnchor: [29, 54], // nhỏ thì sang phải, xuống
    popupAnchor: [6, -40], 
  })

  const showMyLocation = () => {  // di chuyển map tới vị trí người thay pin

    if (locationUser.loaded && !locationUser.error) {
      mapRef.current.flyTo(
        [locationUser.coordinates.lat, locationUser.coordinates.lng],
        18,
        { animate: true }
      );
    } else {
      alert('Không thể xác định vị trí của bạn');
    }
  };
  
  const getLogger = async () => {   // Lấy tên của DataLogger thực
    try {
       const response = await axios.get('https://retoolapi.dev/56myqa/DataLogger');
       const LoggerData = response.data;
       console.log('get successfull')
       setNameDataLogger(LoggerData[0].name)
       
   } catch (error) {
     alert('Đã xảy ra lỗi:');
   }
  };


const client = mqtt.connect('wss://mqtt.eclipseprojects.io:443/mqtt');

useEffect(() => { 
      getLogger()
      client.on('connect', () => {
      console.log("connected");
      client.subscribe("SAWACO/STM32/Latitude");
      client.subscribe("SAWACO/STM32/Longitude");
    });
}, [])

useEffect(() => { // khi DataLogger ổn định. lấy vị trí hiện tại của nó
      setbeginPosition({lat:datalogger.lat,lng:datalogger.lng})
}, [datalogger])  

let array = []

client.on('message', (topic, message) => {
  
  if (topic === 'SAWACO/STM32/Latitude') {
    const jsonDatalat = JSON.parse(message.toString());
    array.push(jsonDatalat)
    console.log(jsonDatalat)
   
  }    
  if(topic === 'SAWACO/STM32/Longitude'){
    const jsonDatalng = JSON.parse(message.toString());
    array.push(jsonDatalng)
    console.log(jsonDatalng)
  }

  if(array.length === 2){
    if(parseFloat(array[0].value)>0){
           
            settimeStamp(array[0].timestamp)
            setDatalogger({ ...datalogger, lat:  parseFloat(array[0].value),  lng:  parseFloat(array[1].value)})                      
            console.log(array)
            array = [] 
    }                
  }
});

// useEffect(() => {
//   console.log('UseEffect Begin')
//   let storedData = localStorage.getItem('datalogger');
//   if (storedData) {
//     setDatalogger(JSON.parse(storedData));
//   }
// }, []);
// useEffect(()=>{
//   let dataArray = []
//   let i = 0
//   let connection = new signalR.HubConnectionBuilder()
//       .withUrl("https://testsawacogps.azurewebsites.net/NotificationHub")
//       .withAutomaticReconnect()
//       .build();
//   // Bắt đầu kết nối
//   connection.start()
//       .then(() => {
//           console.log('Kết nối thành công!');
//       })
//       .catch(err => {
//           console.error('Kết nối thất bại: ', err);
//       });
//   // Lắng nghe sự kiện kết nối lại
//   connection.onreconnected(connectionId => {
//       console.log(`Kết nối lại thành công. Connection ID: ${connectionId}`);
//   });
//   // Lắng nghe sự kiện đang kết nối lại
//   connection.onreconnecting(error => {
//       console.warn('Kết nối đang được thử lại...', error);
//   });
//   connection.on("GetAll", data => {
//     dataArray.push(JSON.parse(data))
//     i++
//     if(i===2){
//       console.log('lat',parseFloat(dataArray[0].Value))
//       console.log('lng',parseFloat(dataArray[1].Value))
//       setDatalogger({lat:parseFloat(dataArray[0].Value),lng:parseFloat(dataArray[1].Value)})
//       i = 0
//       dataArray = []
//     }
//   });
// },[])

const handleMapClickGetLocation = (e) => {  // lấy tọa độ khi Click vô Map
  console.log('lat: '+ e.latlng.lat)
  console.log('lng: '+ e.latlng.lng)
};

useEffect(() => { // Cập nhật bản đồ với giá trị mới của center và ZOOM_LEVEL
  if (mapRef.current) {
        mapRef.current.setView(center, ZOOM_LEVEL);
  }
}, [center]);

// useEffect(() => {
//     // console.log('datalogger Chance',datalogger)
//     setCenter({ lat:  datalogger.lat, lng : datalogger.lng })
//     // localStorage.setItem('datalogger', JSON.stringify(datalogger));
// }, [datalogger]);

// useEffect(() => {
//   let i = 1
//   const interval = setInterval(() => {
//     i++
//     if(i===1){
//       setDatalogger({lat:10.77073376363716,lng:106.65862138935935});
//     }  
//     else if(i===2){
//       setDatalogger({lat:10.772950722507412,lng:106.66094404201701});
//     }
//     else{
//       i=0
//       setDatalogger({lat:10.771785,lng:106.658763 });
//     }
    
//   }, 300000);

//   return () => clearInterval(interval);
// }, []);

const currentRoutingRef = useRef(null);

const currentRoutingBattery = useRef(null);

const handleDisplayRoute = () => {  // hiển thị đường đi của GPS Tracker

  const listLocationFull = datalogger.line.map((item) => L.latLng(item.lat, item.lng));
  
  currentRoutingRef.current = L.Routing.control({
      waypoints: [
        ...listLocationFull
      ],
      lineOptions: {
        styles: [
          {
            color: "blue",
            opacity: 0.6,
            weight: 8
          }
        ]
      },  
      routeWhileDragging: true,
      addWaypoints: false, 
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      show: false,
      createMarker: function() { return null; }
    
  });
  currentRoutingRef.current.addTo(mapRef.current);

  // const allWaypoints = [
  //  ...listLocationFull
  // ];

  //   allWaypoints.forEach((latlng, index) => {
  //     const marker = L.marker(latlng, { icon: positionWarning }).addTo(mapRef.current);
  //     marker.bindPopup(`Tọa độ: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
  //   });
}

const RemoveRoute = () => {   // remove đường đi GPS Tracker
  if (currentRoutingRef.current) {
      currentRoutingRef.current.remove();
      currentRoutingRef.current = null;
  }
};
const RemoveRouteBattery = () => {   // remove đường đi GPS Tracker
  if (currentRoutingBattery.current) {
    currentRoutingBattery.current.remove();
    currentRoutingBattery.current = null;
  }
};

const handleshowModalChangeName= ()=> {
  setshowModalChangeName(true)  // hiển thị bảng đổi tên
}

const handleCloseModalChangeName =()=>{ // đóng bảng đổi tên
  setshowModalChangeName(false)
  getLogger()
}

const handleShowTableWarning = () => {  // hiển thị những địa điểm cảnh báo có trộm
  setshowTableWarning(pre=>!pre)
}

const handleMovetoWarning = () => {  // di chuyển đến địa điểm có trộm
          setdisplayNavigation(false)
          setisDisplayRouteGPS(true)
          setCenter({lat:datalogger.lat , lng: datalogger.lng})
          setZOOM_LEVEL(22) 
          handleDisplayRoute()  
}

useEffect(()=>{
  if( isDisplayRouteGPS && moving){  // Khi con DataLogger di chuyển thì bám theo
      setCenter({lat:datalogger.line[datalogger.line.length-1].lat,lng:datalogger.line[datalogger.line.length-1].lng})
      RemoveRoute()
      handleDisplayRoute()
  }
      
},[datalogger])
console.log('datalogger',datalogger)

////////////////////////////////////////////////
const handleMove = () => {   // Mô phỏng chuyển động GPS Tracker
  setisWarning(true)
  
  if (intervalId) {
    clearInterval(intervalId);
    setMoving(false)
    setIntervalId(null);
    return;
  }
  setMoving(true)
  let i = 0;
  const newIntervalId = setInterval(() => {
    i++;
    if(i===1){
      const currentTime = new Date().toLocaleString();
      setDatalogger(preLogger => ({ ...preLogger , line:[...preLogger.line, {lat: beginPosition.lat, lng: beginPosition.lng, timestamp: currentTime}]}));
    }
    else if (i === 2) {
      const currentTime = new Date().toLocaleString();
      setDatalogger(preLogger => ({ ...preLogger, lat: 10.771153882025505, lng: 106.65905203960455 , line:[...preLogger.line, {lat: 10.771153882025505, lng: 106.65905203960455, timestamp: currentTime}]  }));
    } else if (i === 3) {
      const currentTime = new Date().toLocaleString();
      setDatalogger(preLogger => ({ ...preLogger, lat: 10.772012875290056, lng:  106.6577592381491, line:[...preLogger.line, {lat: 10.772012875290056, lng:  106.6577592381491, timestamp: currentTime}] }));
    } else if (i === 4) {
      const currentTime = new Date().toLocaleString();
      setDatalogger(preLogger => ({ ...preLogger, lat: 10.774400125912738, lng: 106.65707806449242, line:[...preLogger.line, {lat: 10.774400125912738, lng: 106.65707806449242, timestamp: currentTime}] }));
    } 
    else{
      const currentTime = new Date().toLocaleString();
      setDatalogger(preLogger => ({ ...preLogger, lat: 10.780332703846783, lng: 106.659006148882, line:[...preLogger.line, {lat: 10.780332703846783, lng: 106.659006148882, timestamp: currentTime}] }));
      clearInterval(newIntervalId);
      setIntervalId(null);
    }
  }, 2000);
  setIntervalId(newIntervalId);
};

const handleShowPercentBattery = () => { // hiển thị bảng chọn mức pin
      setshowPercentBattery(pre=>!pre)
}

useEffect(()=>{  // Dẫn đường từ vị trí người thay pin qua tất cả vị trí có mức pin cần thay
  
  RemoveRouteBattery()

  if(listLoggerBattery.length>0){
    const calculateDistance = (point1, point2) => {
      const latLng1 = L.latLng(point1.lat, point1.lng);
      const latLng2 = L.latLng(point2.lat, point2.lng);
      const distance = latLng1.distanceTo(latLng2);
      return distance;
    };
    
    const findNearestNeighbor = (graph, visited, currPos, n) => {
      let minDistance = Infinity;
      let nearestNeighbor = -1;
    
      for (let i = 0; i < n; i++) {
        if (!visited[i] && graph[currPos][i] && graph[currPos][i] < minDistance) {
          minDistance = graph[currPos][i];
          nearestNeighbor = i;
        }
      }
      return nearestNeighbor;
    };
    
    const sortCitiesByNearestNeighbor = (locations, startIdx) => {
      const n = locations.length;
      const graph = Array.from({ length: n }, () => Array(n).fill(0));
    
      locations.forEach((loc, idx) => {
        locations.forEach((otherLoc, otherIdx) => {
          if (idx !== otherIdx) {
            graph[idx][otherIdx] = calculateDistance(loc, otherLoc);
          }
        });
      });
    
      const visited = Array(n).fill(false);
      const sortedCities = [];
    
      let currPos = startIdx;
      sortedCities.push(locations[currPos]);
      visited[currPos] = true;
    
      for (let count = 1; count < n; count++) {
        const nearestNeighbor = findNearestNeighbor(graph, visited, currPos, n);
        if (nearestNeighbor !== -1) {
          sortedCities.push(locations[nearestNeighbor]);
          visited[nearestNeighbor] = true;
          currPos = nearestNeighbor;
        }
      }
      return sortedCities;
    };
    
    const handleDisplayRouteBattery = () => {  
        // const newArray = [ ...listBinNeedEmpty];
        // const sortedLocations = bruteForceTSP(newArray);
        // const listLocationRepair = [locationUser.coordinates, ...sortedLocations].map(bin => L.latLng(bin.lat, bin.lng));
        const newArray = [positionUser, ...listLoggerBattery];
        const sortedLocations = sortCitiesByNearestNeighbor(newArray, 0);
        const listLocationFull = sortedLocations.map((bin) => L.latLng(bin.lat, bin.lng));
        currentRoutingBattery.current = L.Routing.control({
            waypoints: [
               ...listLocationFull
            ],
            lineOptions: {
              styles: [
                {
                  color: "blue",
                  opacity: 0.6,
                  weight: 8
                }
              ]
            },  
            routeWhileDragging: true,
            addWaypoints: false, 
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            showAlternatives: false,
            show: false,
            createMarker: function() { return null; }
          
        });
        currentRoutingBattery.current.addTo(mapRef.current);
      
    }

    handleDisplayRouteBattery()
  }

  
  
},[listLoggerBattery])  // thực hiện khi danh sách thay pin thay đổi


useEffect(() => {  // Khi chọn được mức pin cần thay thì lọc ra danh sách thay pin
  if(selectPercentBattery > 0){
        const  listDataLoggerBattery = ListDataLogger.filter((item,index)=>parseInt(item.battery) <= parseInt(selectPercentBattery) )
        setlistLoggerBattery(listDataLoggerBattery)
  }
  
},[selectPercentBattery])

const handleSelectPercentBattery = (percent) => {  // Khi chọn mức pin cần thay trong bảng chọn thì set vị trí người thay pin và set mức pin cần thay
      setdisplayNavigation(false)   
      setselectPercentBattery(percent)
      setpositionUser({lat: locationUser.coordinates.lat, lng: locationUser.coordinates.lng})
}

useEffect(() => {   // Khi set được vị trí người dùng thì hiển thị marker đó lên bản đồ và di chyển map đến vị trí đó
      if( positionUser.lat > 0){
            showMyLocation()
            setIsShowPositionUser(true)
      }
},[positionUser])

const handleDisplayNavigation = () =>{
      setdisplayNavigation(pre=>!pre)   
}

console.log('listLoggerBattery',listLoggerBattery)

  return (
    <>
 <div className='App'>
                  <div className='header font-barlow'>  
                          <div className='menu' onClick={handleDisplayNavigation}><IoMenu />
                                  {isWarning?<div className='amountOfWarning'>{1}</div>:''}
                          </div>
                          
                          <div className='divNavigation'>
                                  <div className='NavigationItem NavigationItemWarning '
                                        onClick={handleShowTableWarning}
                                  >
                                      <div className='NavigationItemIcon'>
                                          <div><IoIosWarning/></div>
                                          <div className='NavigationItemIconText'>Cảnh báo</div>
                                      </div>

                                      <div className='NavigationItemShow divAmountOfWarning'>
                                        {isWarning?<div className='amountOfWarning'>{1}</div>:''}
                                        {showTableWarning ? <div><SlArrowUp/></div>:<div><SlArrowDown/></div>}
                                      </div>


                                  </div>
                                  {showTableWarning && isWarning ? 
                                  
                                  <div className='positionWarning'
                                        onClick={handleMovetoWarning}
                                  >Lý Thường Kiệt</div>:''}

                                  <div className='NavigationItem NavigationItemBattery'
                                        onClick={handleShowPercentBattery}
                                  >
                                      <div className='NavigationItemIcon'>
                                          <div><FaBatteryHalf/></div>
                                          <div>Thay Pin</div>
                                      </div>
                                      <div className='NavigationItemShow divAmountOfWarning'>
                                        
                                      {showPercentBattery ? <div><SlArrowUp/></div>:<div><SlArrowDown/></div>}   
                                      </div>

                                                                  
                                  </div>
                                  
                                  {showPercentBattery && <div className='divBatteryPercent'>
                                  
                                  {
                                    ListBatteryPercent.map((item,index)=>(
                                      <div className='batteryPercent'
                                        onClick={() => handleSelectPercentBattery(item)}
                                      >                              
                                        <div>{`${item}%`}</div>                               
                                      </div>
                                    ))
                                  }
                                  </div>}
                          </div>

                          { displayNavigation &&
                            <div className='divNavigationMobile'>    
                                  <div className='NavigationItem NavigationItemWarning '
                                        onClick={handleShowTableWarning}
                                  >
                                      <div className='NavigationItemIcon'>
                                          <div><IoIosWarning/></div>
                                          <div className='NavigationItemIconText'>Cảnh báo</div>
                                      </div>

                                      <div className='NavigationItemShow divAmountOfWarning'>
                                        {isWarning?<div className='amountOfWarning'>{1}</div>:''}
                                        {showTableWarning ? <div><SlArrowUp/></div>:<div><SlArrowDown/></div>}
                                      </div>


                                  </div>
                                  {showTableWarning && isWarning ? 
                                  
                                  <div className='positionWarning'
                                        onClick={handleMovetoWarning}
                                  >Lý Thường Kiệt</div>:''}

                                  <div className='NavigationItem NavigationItemBattery'
                                        onClick={handleShowPercentBattery}
                                  >
                                      <div className='NavigationItemIcon'>
                                          <div><FaBatteryHalf/></div>
                                          <div>Thay Pin</div>
                                      </div>
                                      <div className='NavigationItemShow divAmountOfWarning'>
                                        
                                      {showPercentBattery ? <div><SlArrowUp/></div>:<div><SlArrowDown/></div>}   
                                      </div>

                                                                  
                                  </div>
                                  
                                  {showPercentBattery && <div className='divBatteryPercent'>
                                  
                                  {
                                    ListBatteryPercent.map((item,index)=>(
                                      <div className='batteryPercent'
                                        onClick={() => handleSelectPercentBattery(item)}
                                      >                              
                                        <div>{`${item}%`}</div>                               
                                      </div>
                                    ))
                                  }
                                  </div>}
                          </div>
                          }
                         

                  </div>


                  <div className='divMap'>
                    <div className='divBtnSimu'>
                      <button 
                            className='divBtnSimuItem'
                            onClick={()=>setisWarning(true)}
                            >Trộm
                      </button>
                      <button 
                            className='divBtnSimuItem'
                            onClick={handleMove}
                            >{intervalId ? 'Stop' : 'Move'}                  
                      </button>
                    </div>                   
                    <MapContainer 
                          center={center} 
                          zoom={ZOOM_LEVEL}     
                          ref={mapRef}>
                        <TileLayer
                             attribution ='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            
                        />
                        <MyClickHandlerGetLocation onClick={handleMapClickGetLocation}/>
                        
                                <Marker 
                                  className='maker'
                                  position={[datalogger.lat,datalogger.lng]}
                                  icon= {isWarning? warning: wakeup }                                
                                >
                                    <Popup>
                                        <div className='div-popup'>
                                            <div className='name'>{nameDataLogger}</div>    
                                            <div>
                                                {`Lat:${datalogger.lat} - Lng:${datalogger.lng} - ${timeStamp}`}  
                                            </div>                                                         
                                            <div className='button'>
                                              <button type="button" class="btn btn-primary" data-mdb-ripple-init
                                                     onClick={handleshowModalChangeName}
                                              >Thay đổi</button>
                                            </div>                                   
                                        </div>                                                                             
                                    </Popup>    
                                </Marker>

                                {ListDataLogger.map((item,index)=>(
                                  <Marker 
                                      className='maker'
                                      position={[item.lat , item.lng]}
                                      icon= { wakeup } 
                                      key={index}                               
                                  >
                                    <Popup>
                                        <div className='div-popup'>
                                            <div className ='name'>{item.name}</div>    
                                            <div className ='name'>{`${item.battery}%`}</div>    
                                                                                                     
                                            {/* <div className='button'>
                                              <button type="button" class="btn btn-primary" data-mdb-ripple-init
                                                     onClick={handleshowModalChangeName}
                                              >Thay đổi</button>
                                            </div>                                   */}
                                        </div>                                                                             
                                    </Popup>    
                                </Marker>
                                ))}

                                {isDisplayRouteGPS &&  datalogger.line.map((item,index)=>(
                                  <Marker 
                                      className='maker'
                                      position={[item.lat , item.lng]}
                                      icon= { positionWarning } 
                                      key={index}                               
                                  >
                                    <Popup>
                                        <div className='div-popup'>
                                            <div>{item.timestamp}</div>                                                                    
                                        </div>                                                                             
                                    </Popup>    
                                </Marker>
                                ))}
                                
                                {isShowPositionUser && 
                                  <Marker 
                                      className='maker'
                                      position={[positionUser.lat , positionUser.lng]}
                                      icon= { user }                             
                                  >
                                  </Marker>
                                }

                                {listLoggerBattery.length > 0 &&  listLoggerBattery.map((item,index)=>(
                                  <Marker 
                                      className='maker'
                                      position={[item.lat , item.lng]}
                                      icon= { battery } 
                                      key={index}                               
                                  >
                                      <Popup>
                                        <div className='div-popup'>
                                            <div className ='name'>{item.name}</div>                                                                                                     
                                            <div className ='name'>{`${item.battery}%`}</div>                                                                                                     
                                        </div>                                                                             
                                      </Popup>
                                      
                                </Marker>
                                ))}

                                
                        
                                                       
                    </MapContainer>
                  </div>
                    
                  <ToastContainer
                        position="top-right"
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={false}
                        pauseOnFocusLoss
                        draggable
                        pauseOnHover
                        theme="light"
                     />
                    
    </div>
                    <ChangeName
                           show={showModalChangeName} 
                           handleClose={handleCloseModalChangeName}   
                           name={nameDataLogger}                     
                    />  

    </>
   
  );
}
function MyClickHandlerGetLocation({ onClick }) {
  const map = useMapEvent('click', (e) => {
    onClick(e);
  });
  
  return null;
  }
export default App;