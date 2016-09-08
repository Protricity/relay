if (typeof self !== 'undefined')
    throw new Error("self already defined");


if (!module) var module = {exports: {}};
module.exports.CLIEventListener = new CLIEventListener();


function CLIEventListener() {
    var events = {};
    this.addEventListener = function (type, callback) {
        if (typeof events[type] == 'undefined')
            events[type] = [];

        if (events[type].indexOf(callback) >= 0)
            throw new Error("Event callback added twice for same event: " + type);
        events[type].push(callback);
        // console.log(events);
    };

    this.removeEventListener = function(type, callback) {
        if (typeof events[type] == 'undefined')
            throw new Error("Event did not exist");

        if(callback) {
            var i = events[type].indexOf(callback);
            if (callback && i >= 0)
                throw new Error("Event callback was not found for event: " + type);

            events[type].splice(i, 1);

        } else {
            delete events[type];
        }
    };

    this.triggerEvent = function(eventObj) {
        var type = eventObj.type;
        if(!type)
            throw new Error("Invalid event object type");

        if (typeof events[type] == 'undefined')
            return false;

        for(var i=0; i<events[type].length; i++) {
            events[type][i](eventObj);
        }
    }
}
