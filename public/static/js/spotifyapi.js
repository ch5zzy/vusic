import Color from "./color.js";
import Cookie from "./cookie.js";

export default class SpotifyApi {
  #accessToken;
  #refreshToken;
  #title;
  #artists;
  #trackId;
  #color;
  #colors;
  #image;
  #tempo;
  #pollTimer;
  #beatTimer;
  #updateFunc;
  #beatFunc;

  constructor(accessToken, refreshToken) {
    this.#accessToken = accessToken;
    this.#refreshToken = refreshToken;
    this.#title = "";
    this.#artists = [];
    this.#trackId = "";
    this.#color = new Color();
    this.#colors = [];
    this.#image = "";
    this.#tempo = undefined;
    this.#updateFunc = () => {};
    this.#beatFunc = () => {};
  }

  //getter methods
  get trackTitle() {
    return this.#title;
  }
  get trackArtists() {
    return this.#artists;
  }
  get trackArtistsNames() {
    var artistNames = [];
    this.#artists.forEach(artist => {
      artistNames.push(artist.name);
    });
    return artistNames.join(", ");
  }
  get trackId() {
    return this.#trackId;
  }
  get trackColor() {
    return this.#color;
  }
  get trackColors() {
    return this.#colors;
  }
  get trackImage() {
    return this.#image;
  }
  get trackTempo() {
    return this.#tempo;
  }

  //setter methods
  set pollPeriod(period) {
    clearInterval(this.#pollTimer);
    this.#pollTimer = setInterval(() => {
      this.#updateTrack();
    }, period);
  }
  set updateFunc(func) {
    this.#updateFunc = func;
  }
  set beatFunc(func) {
    this.#beatFunc = func;
  }

  //performs a spotify api request
  request(type, endpoint, onSuccess) {
    fetch("/spotify-api?type=" + type + "&endpoint=" + endpoint
      + "&access_token=" + this.#accessToken)
      .then(response => {
        if(response && response.status == 200) {
          response.json().then(data => onSuccess(data));
        }
      });
  }

  //gets the current track
  #getCurrentTrack(onSuccess) {
    fetch("/current-track?access_token=" + this.#accessToken)
      .then(response => {
        if(response && response.status == 200) {
          response.json().then(data => onSuccess(data));
        }
      });
  }

  //gets the current track's audio features
  #getAudioFeatures(onSuccess) {
    this.request("GET", "audio-features/" + this.#trackId, data => onSuccess(data));
  }

  //updates the current track
  #updateTrack() {
    this.#checkToken();

    this.#getCurrentTrack(data => {
      if(data && data.item && (data.item.id != this.#trackId ||
        data.item.name != this.#title)) {
        this.#title = data.item.name;
        this.#artists = data.item.artists;
        this.#trackId = data.item.id;
        this.#color = Color.cast(data.item.color);
        this.#colors = Color.castArray(data.item.colors);
        this.#image = "";
        if(data.item.album.images.length != 0)
          this.#image = data.item.album.images[0].url;

        this.#getAudioFeatures(features => {
          if(this.#tempo != features.tempo) {
            this.#tempo = features.tempo;
            clearInterval(this.#beatTimer);
            if(this.#tempo) {
              this.#beatTimer = setInterval(() => {
                this.#beat();
              }, Math.pow(this.#tempo * (1/60000), -1));
            }
          }

          //call update function once everything has been updated
          this.#updateFunc();
        });
      }
    });
  }

  #checkToken() {
    if(!Cookie.get("access_token")) {
      fetch("/refresh_token?token=" + this.#refreshToken)
        .then(response => {
          if(response && response.status == 200) {
            response.json().then(data => {
              if(data.access_token) {
                this.#accessToken = data.access_token;
                this.#refreshToken = data.refresh_token;
                Cookie.set("access_token", this.#accessToken, 3600);
                Cookie.set("refresh_token", this.#refreshToken);
              } else {
                window.location.replace("./");
              }
            });
          }
        });
      }
  }

  //executes on every beat, according to the current track's tempo
  #beat() {
    this.#beatFunc();
  }
}
