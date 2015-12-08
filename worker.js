/**
 * Created by ari on 6/19/2015.
 */

importScripts('client/client-worker.js');

self.addEventListener('message', function (e) {
    ClientWorker.execute(e.data, e);
}, false);

if(typeof Crypto === 'undefined') {
    importScripts('pgp/lib/support/nfcrypto.js');
    Crypto = self.nfCrypto;
}
