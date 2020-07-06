//Checking userAgent information:
var userAgent = navigator.userAgent;
//If user is on mobile, or is using neither chrome or firefox...
if (
    userAgent.indexOf("Mobi") !== -1 ||
    userAgent.indexOf("Firefox") == -1 &&
    userAgent.indexOf("Chrome") == -1
){
    //Redirect to a page that asks them to come back with a different setup.
    window.location = "redirect.html";
}
