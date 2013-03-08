(function( expose ) {
      var CLIENT_ID = null;
      var SCOPES = ['https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/drive.install',
                    'https://www.googleapis.com/auth/userinfo.profile'];
      var authuserIndex = 0;
      var authuserIndexLimit = 5;

      /**
       * Init the google CLIENT_ID nad SCOPES
       */
      expose.init = function init(clientID){
          CLIENT_ID = clientID;
      };

      /**
       * Check if the current user has authorized the application.
       */
      function checkAuth() {
        gapi.auth.authorize(
            {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true, 'authuser':authuserIndex},
            handleAuthResult);
      };
      expose.checkAuth = checkAuth;

      /**
       * Append a link in a <ul></ul>.
       */
      function appendLink(parent, href, text, title) {
        var link = document.createElement("a");
        link.href = href;
        link.textContent = text;
        if(title !== undefined) {
            link.title = title;
        }
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
       * Get the outbound link for opening with mdReader.
       *
       * @param (String) the id of document.
       */
      function getOutboundLink(id) {
          var link = window.location.protocol + "//" + window.location.host + window.location.pathname;
          link += '?state=' + JSON.stringify({'action': 'open', 'ids': [id]});
          return link
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
              if(!resp.error){
                  appendLink(topNav, getOutboundLink(id), resp.title, 'Please right click copy the link address for sharing.');
                  document.title = "[" + resp.title + "]" + "mdReader -- Markdown reader for Google Drive";
                  if(resp.downloadUrl){
                      getDocumentContent(resp.downloadUrl);
                  }
              }
              else{
                  checkAuthuser(null, id);
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
              var mdHtml = marked.parse(mdText);
              mdHtmlDisplay.innerHTML = "<br/><br/>" + mdHtml;
          };
          xhr.send()
      }
 
      /**
       * Init the authorize process.
       */
      function doAuth(){
          mdHtmlDisplay.innerHTML = "<p><br/><br/>Please allow the popup window to authorize the access, <br/>"
                                    + "or manually click <input type=\"button\" id=\"authorizeButton\" value=\"Authorize\" />"
                                    + " if popup window is blocked.</p>";
          var authButton = document.getElementById('authorizeButton');
          authButton.onclick = popupAuth;
          popupAuth();
      }

      /**
       * Do the popup auth.
       */
      function popupAuth(){
          gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false, 'authuser':''},
                              handleAuthResult);
      }

      /**
       * Check if userId, if not right popup a auth window
       *
       * @userId (Object) the userid in page request.
       * @docId (String) the document id.
       */
      function checkAuthuser(userId, docId){
          var accessToken = gapi.auth.getToken().access_token;
          var request = gapi.client.request({
              'path': '/oauth2/v1/tokeninfo/?access_token=' + accessToken,
              'method': 'GET'});
          callback = function(resp) {
              if(userId===null || resp.user_id.toString() !== userId.toString()) {
                  authuserIndex++;
                  if(authuserIndex < authuserIndexLimit){
                     checkAuth();
                  }
                  else{
                     doAuth();
                  }
              }
              else{
		  getDocumentInfo(docId);
              }
          };
          request.execute(callback);
      }

      /**
       * Called when authorization server replies.
       *
       * @param {Object} authResult Authorization result.
       */
      function handleAuthResult(authResult) {
        if (authResult && !authResult.error) {
          // Access token has been successfully retrieved, requests can be sent to the API.
          var queryState = qs("state");
          if(queryState !== undefined){
              queryState = JSON.parse(unescape(queryState));
              if(queryState["action"] === 'open'){
                var docId = queryState['ids'][0]; 
                if(queryState["userId"] !== undefined && queryState["userId"] !== null){
                   checkAuthuser(queryState["userId"], docId);
                }
                else{
                   getDocumentInfo(docId);
                }
              }
          }
          else{
              mdHtmlDisplay.innerHTML = "<p><br/><br/>No md file to view.</p>";
          }
        } else {
          // No access token could be retrieved, start the authorization flow.
          doAuth();
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
