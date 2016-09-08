
if(typeof self !== 'undefined')
    throw new Error("self already defined");


if (!module) var module = {exports:{}};
module.exports.CLIEventListener = new CLIEventListener();


function CLIEventListener() {
  var events = {};
  this.addEventListener = function(eventName, callback) {
      if(typeof events[eventName] == 'undefined')
          events[eventName] = [];
          
      events[eventName].push(callback);
      // console.log(events);
  };
  
}

// TODO: session key

