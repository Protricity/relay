
if(typeof self.addEventListener !== 'undefined')
    throw new Error("self.addEventListener already defined");

var events = {};
// This doesn't work
self.addEventListener = function(eventName, callback) {
    if(typeof events[eventName] == 'undefined')
        events[eventName] = [];
        
    events[eventName].push(callback);
};
