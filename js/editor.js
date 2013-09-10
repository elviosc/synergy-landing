(function() {
  var changes = {}, editEl = null;
  
  var authHost     = "https://www.bitballoon.com",
      resourceHost = "https://www.bitballoon.com/api/v1",
      endUserAuthorizationEndpoint = authHost + "/oauth/authorize";  

  function extractToken(hash) {
    var match = hash.match(/access_token=(\w+)/);
    return !!match && match[1];
  }

  var token = extractToken(document.location.hash);
  if (token) {
    document.location.hash = "admin";
  }

  var addButtons = function() {
    var div = document.createElement("div");
    div.className = "bb-minicms-component";
    div.setAttribute("style", "position: fixed; bottom: 10px; right: 10px;");
    var saveButton = document.createElement("div");
    var cancelButton = document.createElement("div");
    
    var buttonCSS = "display: inline-block; border: 1px solid #666; font-size: 12px; font-weight: bold; padding: 10px 20px;";
    saveButton.setAttribute('style', buttonCSS + 'background: #90b71c; color: #fff; margin-right: 10px;');
    cancelButton.setAttribute('style', buttonCSS + 'background: #eee; color: #222;');
    saveButton.textContent = "Save changes";
    cancelButton.textContent = "Cancel";
    saveButton.className = "bb-minicms-component";
    cancelButton.className = "bb-minicms-component";
    div.appendChild(saveButton);
    div.appendChild(cancelButton);

    document.body.appendChild(div);                    
    
    saveButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      saveChanges();
    });
    cancelButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      cancel();
    });
  };
  
  var cancel = function() {
    closeAdminMode();
    document.location.reload();
  };
  
  var closeAdminMode = function() {
    changes = {};
    editEl = null;
    var nodes = document.querySelectorAll('.bb-minicms-component');
    for (var i=0, len=nodes.length; i<len; i++) {
      nodes[i].parentNode.removeChild(nodes[i]);
    }
    if (document.location.hash) document.location.hash = '';
  };
  
  var saveChanges = function() {
    var patch = [];
    for (var el in changes) {
      patch.push({
        op: "replace",
        path: el,
        value: changes[el]
      });
    }
    
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState == 4) {
        document.location.hash = '';
      }
    }
    xhr.open("PATCH", resourceHost + '/sites/' + document.location.host + '/files/index.html', true);
    xhr.setRequestHeader('Authorization', "Bearer " + token);
    xhr.setRequestHeader('Content-Type', 'application/json-patch+json');
    xhr.send(JSON.stringify(patch));
  };
  
  var adminMode = function() {
    if (!(token || document.location.protocol == "file:")) {
      var authUrl = endUserAuthorizationEndpoint + "?response_type=token&client_id="    + document.location.host + "&redirect_uri=" + window.location;
      return document.location.href = authUrl;
    }
    
    addButtons();

    var baseStyle = "position: absolute; display: block; margin: 0; padding:0; border: 0; outline: 3px solid rgba(17,42,244,0.5); box-shadow: 0 0 15px rgba(0,0,0,0.3);",
        ids       = ["container", "lft", "rgt", "top", "bottom"],
        els       = {};

    for (var i=0, len=ids.length; i<len; i++) {
      var div = document.createElement("div");
      div.className = "bb-minicms-component";
      div.id        = "bb-minicms-" + ids[i];
      div.setAttribute('style', baseStyle + "display: none;");
      document.body.appendChild(div);
      els[ids[i]] = div;
    }

    var overlay = document.createElement("div");
    overlay.setAttribute('style', 'display: none;');
    document.body.appendChild(overlay);
    var overlayStyle = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0, 0.5); display: block; z-index: 999;";

    var editFrame = document.createElement("iframe");
    editFrame.src = "http://codemirror-iframe.bitballoon.com/";
    editFrame.setAttribute('style', "display: none;");
    document.body.appendChild(editFrame);


    var nodes = document.querySelectorAll("h1, h2, h3, h4, h5, h6, div, p, a, img, span, small, blockquote, label, cite, li");

    for (var i=0, len=nodes.length; i<len; i++) {
      nodes[i].addEventListener('mouseover', handler, false);
      nodes[i].addEventListener('click', edit, false);
    }

    window.addEventListener('message', onMessage, false);
    overlay.addEventListener('click', stopEditing, false)

    function handler(event) {
      if (event.target && event.target.className !== "bb-minicms-component") {
        highlight(event.target);
      }
    }

    function onMessage(event) {
      if (!editEl) return;
      try {
        var data = JSON.parse(event.data);

        if (data.codeMirrorEvent) {
          if (data.codeMirrorEvent == "save") {
            if (data.value !== editEl.outerHTML) {
              var selector = uniqueSelector(editEl);            
              changes[selector] = data.value;
              editEl.outerHTML = data.value;
              console.log(changes);
            }
          }
          stopEditing();
        }

      } catch (e) {
        console.log(e);
      }

    }

    function edit(event) {
      event.preventDefault();

      if (editEl || (event.target.className == "bb-minicms-component")) return false;

      editEl = event.target;

      editFrame.contentWindow.postMessage(JSON.stringify({
        mode: "htmlmixed",
        value: editEl.outerHTML,
        title: "Editing (" + editEl.nodeName + ")"
      }), "*");

      var top = Math.max(window.innerHeight / 2 - 150 + window.scrollY, 50);
      var left = Math.max(window.innerWidth / 2 - 200 + window.scrollX, 50);

      overlay.setAttribute("style", overlayStyle);
      editFrame.setAttribute("style", "z-index: 1000; width: 400px; height: 300px; border: none; position: absolute;" +
                                      "top: " + top + "px; left: " + left + "px; background: #fff;");

      return false;
    };

    function stopEditing() {
      overlay.setAttribute('style', 'display: none;');
      editFrame.setAttribute('style', 'display: none;');
      editEl = null;    
    }

    function position(el, top, left, width, height) {
      el.setAttribute('style', baseStyle + "top: " + top + "px; left: " + left + "px; width: " + width + "px; height: " + height + "px;");
    }

    function highlight(node) {
      var rect = node.getBoundingClientRect();    
      var top = window.scrollY + rect.top;

      position(els.top, top, rect.left + 3, rect.width - 6, 0);
      position(els.rgt, top, rect.left + rect.width, 0, rect.height);
      position(els.bottom, top + rect.height, rect.left + 3, rect.width - 6, 0);
      position(els.lft, top, rect.left, 0, rect.height);
    }

    function uniqueSelector(el) {
      if (!(el instanceof Element)) return;
      var path = [];
      while (el && el.nodeType === Node.ELEMENT_NODE) {
          var selector = el.nodeName.toLowerCase();
          if (el.id) {
              selector += '#' + el.id;
          } else {
              var sib = el, nth = 1;
              while (sib.nodeType === Node.ELEMENT_NODE && (sib = sib.previousElementSibling) && nth++);
              if (nth > 1) {
                selector += ":nth-child("+nth+")";
              }
          }
          path.unshift(selector);
          if (!el.id && (el.parentNode && el.parentNode.nodeName !== "BODY")) {
            el = el.parentNode;
          } else {
            el = null;
          }
      }
      return path.join(" > ");    
    };    
  };
  
  function runRoutes() {
    switch(document.location.hash) {
      case "#admin":
        adminMode();
        break;
      case "#save":
        saveChanges();
      
        break;
      default:
        closeAdminMode();
    }
  }

  window.addEventListener('hashchange', runRoutes, false);
  
  runRoutes();
})();