import Color from "./color.js";
import Cookie from "./cookie.js";
import SpotifyApi from "./spotifyapi.js";

let visTimer;
var circleRadius = 0;
var maxCircleRadius;
var drawCircle = false;
var circleColor = new Color(255, 255, 255);
var increase = false;
var rot = 0;
var maxRot = 0;
var canvas, ctx;
var circleSize;
var numCircles = 14;
var circleInterval = 2 * Math.PI / numCircles;
var circleText = "play a song!";

let trackImg = document.querySelector("#track-image");
let trackInfo = document.querySelector("#track-info");
let trackTitle = document.querySelector("#track-title");
let trackArtistAlbum = document.querySelector("#track-artist-album");

updateCanvasSize();

document.querySelector("#vtag").addEventListener("click", event => {
  if (drawCircle) {
    trackInfo.style.visibility = "hidden";
    trackInfo.style.display = "none";
    trackImg.style.display = "block";
    drawCircle = false;
  } else {
    trackInfo.style.visibility = "visible";
    trackInfo.style.display = "flex";
    trackImg.style.display = "none";
    drawCircle = true;
  }
});

var accessToken = Cookie.get("access_token");
var refreshToken = Cookie.get("refresh_token");
if (!accessToken && !refreshToken) {
  window.location.replace("/");
}

const spotifyApi = new SpotifyApi(accessToken, refreshToken);
spotifyApi.pollPeriod = 1500;
spotifyApi.beatFunc = () => {
  increase = true;
  maxRot += circleInterval;
}
spotifyApi.updateFunc = () => {
  if (spotifyApi.trackTitle != "") {
    circleText = "";
    trackTitle.innerHTML = spotifyApi.trackTitle.toLowerCase();
    circleText += spotifyApi.trackTitle.toLowerCase();
    trackArtistAlbum.innerHTML = spotifyApi.trackArtistsNames.toLowerCase() +
      (spotifyApi.trackAlbum != "" ? (" &#183; " + spotifyApi.trackAlbum.toLowerCase()) : "");
    circleText += " · " + spotifyApi.trackArtistsNames.toLowerCase() +
      (spotifyApi.trackAlbum != "" ? (" · " + spotifyApi.trackAlbum.toLowerCase()) : "");
    document.querySelector("#track-image").src = spotifyApi.trackImage;

    const trackColor = spotifyApi.trackColor;
    const textColor = Color.textColor(trackColor);

    document.querySelector("body").style.background = trackColor.hex;
    document.querySelector("body").style.color = textColor.rgba();
    circleColor = textColor;

    maxRot = rot + 2 * Math.PI;
  }
}

visTimer = setInterval(audioVisualizerUpdate, 1);

function audioVisualizerUpdate() {
  updateCanvasSize();

  maxCircleRadius = Math.max(canvas.width, canvas.height)/7;

  circleSize = maxCircleRadius/7;
  //numCircles = Math.round(outerCircleCircum/(circleSize * 4)) = 14

  spotifyApi.beatFunc = () => {
    increase = true;
    maxRot += circleInterval;
  }

  if (spotifyApi.trackTempo == undefined) {
    circleRadius = maxCircleRadius;
  } else if (increase && circleRadius < maxCircleRadius) {
    circleRadius = Math.min(maxCircleRadius, circleRadius * 1.05);
    if (circleRadius >= maxCircleRadius) {
      increase = false;
    }
  } else if (circleRadius > 2) {
    circleRadius /= 1.01;
  }

  increaseRot();

  drawBeatCircle();
}

function drawBeatCircle() {
  ctx.strokeStyle = circleColor.rgba(0.2);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 8;

  if (drawCircle) {
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, circleRadius, 0, 2 * Math.PI);
    ctx.stroke();
  } else {
    trackImg.style.transform = "rotate(" + (-rot) + "rad)";
    trackImg.style.width = maxCircleRadius * 1.5 + "px";
    drawTextAlongArc(setStringLen(circleText, 30, 80));
    /*
    if (spotifyApi.trackImage != "")
      trackImg.style.border = (circleRadius / maxCircleRadius) * (maxCircleRadius / 5) + "px solid " + circleColor.rgba(0.2);
    else 
      trackImg.style.border = "none";
    */
  }

  var maxDim = Math.max(canvas.width, canvas.height);
  var dir = -1;

  for (var j = 1.3; maxDim/2 + maxCircleRadius * j < maxDim * 1.5; j += 0.5) {
    dir = -dir;
    for (var i = 0; i < numCircles; i++) {
      let x = canvas.width/2 + maxCircleRadius * j * Math.cos(dir * (rot + circleInterval * i + Math.PI/4));
      let y = canvas.height/2 + maxCircleRadius * j * Math.sin(dir * (rot + circleInterval * i + Math.PI/4));

      ctx.beginPath();
      ctx.arc(x, y, circleSize, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

function increaseRot() {
  if (spotifyApi.trackTempo) {
    if (rot < maxRot) {
      rot += (spotifyApi.trackTempo/(Math.pow(10, 4) * 1.5) * (maxRot - rot)/circleInterval) || 0;
    }
    if (rot > 2 * Math.PI && maxRot > 2 * Math.PI) {
      rot = rot - 2 * Math.PI;
      maxRot = maxRot - 2 * Math.PI;
    }
  } else {
    rot = (rot + 0.001) % (2 * Math.PI);
  }
}

function drawTextAlongArc(str){
  var angle = 1.9 * Math.PI;
  ctx.save();
  ctx.font = "80% Major Mono Display";
  ctx.strokeStyle = circleColor.rgba(1);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(-1 * angle/2);
  ctx.rotate(-1 * (angle/str.length) / 2);
  ctx.rotate(-1 * rot);
  for (var n = 0; n < str.length; n++) {
      ctx.rotate(angle/str.length);
      ctx.save();
      ctx.translate(0, -1 * (maxCircleRadius - 20));
      var char = str[n];
      ctx.fillText(char, 0, 0);
      ctx.restore();
  }
  ctx.restore();
}

function updateCanvasSize() {
  canvas = document.querySelector("#audio-visualizer");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx = canvas.getContext("2d");
}

function setStringLen(str, minLen, maxLen) {
  if (str.length < minLen)
    str = " ".repeat(Math.floor((minLen - str.length)/2)) + str + 
      " ".repeat(Math.ceil((minLen - str.length)/2));
  if (str.length > maxLen)
    str = str.slice(0, maxLen - 3) + "...";
  return str;
}