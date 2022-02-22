import Cookie from "./cookie.js";

let params = new URLSearchParams(document.location.search);
Cookie.set("access_token", params.get("access_token"), 3600);
Cookie.set("refresh_token", params.get("refresh_token"));
window.location.replace("./");
