/**
 * Created by ari on 6/19/2015.
 */

importScripts('client/client.js');

self.addEventListener('message', function (e) {
    Client.execute(e.data, e);
});

if(typeof Crypto === 'undefined') {
    importScripts('pgp/lib/support/nfcrypto.js');
    Crypto = self.nfCrypto;
}
console.log(Crypto);