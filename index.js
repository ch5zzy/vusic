import express from "express";
import fetch from "node-fetch";
import uniqid from "uniqid";
import path from "path";
import Color from "./public/static/js/color.js";
import ColorThief from "color-thief-node";
import { getTrackCanvases, getRecentCanvases } from "./public/static/js/canvasapi/canvases.js";

var clientId = process.env.spotifyClientId;
var clientSecret = process.env.spotifyClientSecret;
var redirectUri = process.env.spotifyCallbackUri;
var state;

var app = express();

function stringify(data) {
  return (new URLSearchParams(data)).toString();
}

function getPlaylistImg(playlistId, accessToken, func) {
  //check that access token was provided
  if (accessToken == null) {
      return stringify({
        error: "invalid_api_request"
      });
  }

  var authOptions = {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Content-Type": "application/json"
    },
  }

  fetch("https://api.spotify.com/v1/playlists/" + playlistId, authOptions)
    .then(function(response) {
      if (response && response.status == 200) {
        response.json().then(function(data) {
          if (data.images.length != 0)
            func(data.images[0].url);
          else
            func("");
        });
      } else {
        func("");
      }
    });
}

function getImgColors(imgUrl, func) {
  if (imgUrl == "") {
    var color = new Color(15, 15, 15);
    var colors = [new Color(63, 63, 63), new Color(2, 2, 2),
      new Color(1, 1, 1), new Color(5, 5, 5), new Color(45, 45, 45)];
    func(color, colors);
    return;
  }

  ColorThief.getColorFromURL(imgUrl).then(color => {
    color = new Color(...color);
    ColorThief.getPaletteFromURL(imgUrl).then(palette => {
      var colors = [];
      palette.forEach(swatch => {
        colors.push(new Color(...swatch));
      });

      func(color, colors);
    });
  });
}

app.get("/login", function(req, res) {
  //create state string for validation
  state = uniqid("vusic-spotify-");

  var scope = "user-read-currently-playing user-read-playback-position user-read-recently-played";

  //redirect to spotify login with desired scope
  res.redirect("https://accounts.spotify.com/authorize?" +
    stringify({
      response_type: "code",
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state
    }));
});

app.get("/callback", function(req, res) {
  var code = req.query.code || null;
  var reqState = req.query.state || null;

  //ensure state strings match
  if (reqState === null || reqState != state) {
    res.redirect("/#" +
      stringify({
        error: "state_mismatch"
      }));
  }

  var body = {
    code: code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  };
  var authOptions = {
    method: "POST",
    headers: {
      "Authorization": "Basic " + (new Buffer.from(clientId + ":" +
        clientSecret).toString("base64")),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: stringify(body)
  };

  //fetch the spotify access token
  fetch("https://accounts.spotify.com/api/token", authOptions)
    .then(function(response) {
      if (response && response.ok) {
        response.json().then(function(data) {
          process.env.spotifyRefreshToken = data.refresh_token;
          res.redirect("/?" + stringify({
            access_token: data.access_token,
            refresh_token: data.refresh_token
          }));
        });
      }
    })
    .catch(function(error) {
      console.log(error);
    });
});

app.get("/refresh_token", function(req, res) {
  var refreshToken = req.query.token || null;

  var body = {
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  };
  var authOptions = {
    method: "POST",
    headers: {
      "Authorization": "Basic " + (new Buffer.from(clientId + ":" +
        clientSecret).toString("base64")),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: stringify(body)
  };

  fetch("https://accounts.spotify.com/api/token", authOptions)
    .then(function(response) {
      if (response && response.ok) {
        response.json().then(function(data) {
          process.env.spotifyRefreshToken = data.refresh_token;
          res.send({
            access_token: data.access_token,
            refresh_token: data.refresh_token
          });
        });
      }
    })
    .catch(function(error) {
      console.log(error);
    });
});

app.get("/", function(req, res) {
  if (!req.query.access_token || !req.query.refresh_token) {
    res.sendFile(path.join(path.resolve(), "public/html/views/login.html"));
    return;
  }

  res.sendFile(path.join(path.resolve(),
    "public/html/actions/saveAccessToken.html"));
});

app.get("/me", function(req, res) {
  res.sendFile(path.join(path.resolve(), "public/html/views/index.html"));
});

app.get("/spotify-api", function(req, res) {
  var reqType = req.query.type || null;
  var endpoint = req.query.endpoint || null;
  var accessToken = req.query.access_token || null;

  //check that request type, endpoint, and access token were provided
  if (reqType === null || endpoint === null || accessToken == null) {
    res.redirect("/#" +
      stringify({
        error: "invalid_api_request"
      }));
  }

  var authOptions = {
    method: reqType,
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Content-Type": "application/json"
    },
  }

  //perform api request
  fetch("https://api.spotify.com/v1/" + endpoint, authOptions)
    .then(function(response) {
      if (response && response.status == 200) {
        response.json().then(function(data) {
          res.send(data);
        });
      } else {
        res.send({});
      }
    });
});

app.get("/current-track", function(req, res) {
  var accessToken = req.query.access_token || null;

  //check that access token was provided
  if (accessToken == null) {
    res.redirect("/#" +
      stringify({
        error: "invalid_api_request"
      }));
  }

  var authOptions = {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Content-Type": "application/json"
    },
  }

  fetch("https://api.spotify.com/v1/me/player/currently-playing", authOptions)
    .then(function(response) {
      if (response && response.status == 200) {
        response.json().then(function(data) {
          if (data.item != undefined) {
            if (!data.item.is_local || (data.item.is_local && data.context.type
              == "playlist")) {
              if (!data.item.is_local) {
                var imgUrl = data.item.album.images[0].url;
                getImgColors(imgUrl, function(color, colors) {
                  data.item.color = color;
                  data.item.colors = colors;

                  getTrackCanvases([data.item]).then((canvases) => {
                    if (canvases.length > 0)
                      data.item.canvasUrl = canvases[0].canvasUrl;
                    
                    res.send(data);
                  });
                });
              } else {
                getPlaylistImg(data.context.uri.split(":")[2], accessToken,
                  function(imgUrl) {
                  getImgColors(imgUrl, function(color, colors) {
                    if (data.item.album != undefined)
                      data.item.album.images = [{ url: imgUrl }];
                    else
                      data.item.album = { images: [{ url: imgUrl }]};
                    data.item.color = color;
                    data.item.colors = colors;
                    res.send(data);
                  });
                });
              }
            } else {
              getImgColors("", function(color, colors) {
                data.item.color = color;
                data.item.colors = colors;
                res.send(data);
              });
            }
          } else {
            res.send({});
          }
        });
      } else {
        res.send({});
      }
    });
});

app.get("/recent-canvases", getRecentCanvases);

app.use(express.static("public/static"));

const port = process.env.PORT || 8888;
var server = app.listen(port, "0.0.0.0", () => {
  console.log("Running on " + server.address().address + ":" + port);
});
