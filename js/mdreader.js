(function( expose ) {
      var CLIENT_ID = null;
      var SCOPES = null;

      /**
       * Init the google CLIENT_ID nad SCOPES
       */
      expose.init = function init(clientID, scopes){
          CLIENT_ID = clientID;
          SCOPES = scopes;
      };

      /**
       * Check if the current user has authorized the application.
       */
      expose.checkAuth = function checkAuth() {
        gapi.auth.authorize(
            {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true},
            handleAuthResult);
      };

      /**
       * Append a link in a <ul></ul>.
       */
      function appendLink(parent, href, text) {
        var link = document.createElement("a");
        link.href = href;
        link.textContent = text;
        parent.appendChild(document.createElement("li")).appendChild(link);
      }

      /**
       * Get the querystring element.
       * From http://stackoverflow.com/a/9362358/2038337
       */
      function qs(key) {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for(var i = 0; i < hashes.length; i++){
          hash = hashes[i].split('=');
          vars.push(hash[0]);
          vars[hash[0]] = hash[1];
        }
        return vars[key];
      }

      /**
       * Called for get the info of a document.
       *
       * @param {String} id Document id.
       *
       */
      function getDocumentInfo(id) {
          var request = gapi.client.request({
              'path': '/drive/v2/files/' + id,
              'method': 'GET'});
          callback = function(resp) {
              appendLink(topNav, resp.webContentLink, resp.title);
              if(resp.downloadUrl){
                  getDocumentContent(resp.downloadUrl);
              }
          };
          request.execute(callback);
      }

      /**
       * Get the content of a document.
       *
       * @param {String} downloadUrl Document id.
       *
       */
      function getDocumentContent(downloadUrl) {
          var accessToken = gapi.auth.getToken().access_token;
          var xhr = new XMLHttpRequest();
          xhr.open('GET', downloadUrl);
          xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
          xhr.onload = function() {
              var mdText = xhr.responseText;
              var mdHtml = markdown.toHTML(mdText);
              mdHtmlDisplay.innerHTML = "<br/><br/>" + mdHtml;
          };
          xhr.send()
      }
 
      /**
       * Called when authorization server replies.
       *
       * @param {Object} authResult Authorization result.
       */
      function handleAuthResult(authResult) {
        var authButton = document.getElementById('authorizeButton');
        authButton.style.display = 'none';
        if (authResult && !authResult.error) {
          // Access token has been successfully retrieved, requests can be sent to the API.
          var queryState = qs("state");
          if(queryState != undefined){
              queryState = JSON.parse(unescape(queryState));
              if(queryState["action"] === 'open'){
                getDocumentInfo(queryState['ids'][0]);
              }
          }
          else{
              mdHtmlDisplay.innerHTML = "<p><br/><br/>No md file to view.</p>";
          }
        } else {
          // No access token could be retrieved, show the button to start the authorization flow.
          gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false},
                              handleAuthResult);
        }
      }

} )( (function() {
  if ( typeof exports === "undefined" ) {
    window.mdreader = {};
    return window.mdreader;
  }
  else {
    return exports;
  }
} )() );
