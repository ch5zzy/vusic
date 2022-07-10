import Cookie from "./cookie.js";

const accessToken = Cookie.get("access_token");
const refreshToken = Cookie.get("refresh_token");
if(accessToken && refreshToken) {
    window.location.replace("/me");
}
