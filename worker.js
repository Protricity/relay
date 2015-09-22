/**
 * Created by ari on 6/19/2015.
 */

importScripts('commands/commands.js');

self.addEventListener('message', function (e) {
    Commands.execute(e.data, e);
});