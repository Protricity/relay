# relay

What is the Relay Network?

Relay is an up-and-coming socket-based Social Network. All the features you’ve come to expect from the big brands can be found within Relay - feeds, comments, user groups, forums, but there's much more.....
Open-Source, Community Owned, Democratically Operated, 
and free-to-use forever!
(So what is it?)

Metaphors:

Relay is Democracy. Anyone can contribute. All developmental decisions occur in a public space subject to community audits. Relay will never be sold, shelved, or repurposed and will exist as long as it has a user base. Anyone can create and publish a (secret ballot) public vote for any reason. It’s your call.

Relay is Content. The Relay KeySpace is a paradigm shift in web content delivery. Using the latest browser technology, content loads instantly via always-on two-way socket communication. Using PGP Encryption, user-contributed Relay content is verified automatically and cannot be faked or manipulated in any way. Only the original author has the power to change their KeySpace Content. Content consists of anything from feed posts, to personal web pages, business functionality, even a technology sandbox. It’s your KeySpace.

Relay is Privacy. By default you can’t see anyone and no one can see you. Like any social network, you add friends and contacts and determine what level of access each user has to your KeySpace. No fire walls. No data leaks. No state surveillance. You have Control.




Relay is Reputation. Once you create a PGP Identity, it can never be altered or faked. Public identities created for the purposes of delivering consumer content will inevitably build a strong reputation among that user base. Your Brand is your Reputation.

Relay is Business. Small and Large Business alike benefit by taking advantage of free Enterprise-level functionality in Relay. Whether the goal is a quick and simple business card webpage, or a feature-rich ecommerce shop with cart and payment options, or just live customer support, Relay is the way to go. No server maintenance. No staff overhead. No costs at all. Just business.

Relay is Unifying. Although decentralized in design, all Relay servers are purposed with centralizing the flow of information. On the Relay network, channels of information are unified (via smart networking), and users are only ever one degree of separation away from their destination, or each other. Together is better.

Relay is Local. Once you’re ready to meet people, Relay offers communication in every conceivable category. You can join channels based on interest, locality (like timezone or town), or make up your own. Quickly and easily find like-minded people in a controlled and safe chat environment. Unleash the power of Community Source.

Relay is Customization. Create a public profile and customize its content to the last HTML tag. Or set up a small (or big) business website that will live on the relay network for-free and forever. You can get involved in activities like Public Votes or Community Calls to Action or even write your own new relay scripts to further enrich the social experience. Taking social networking to the next level.

Relay is Best Practice. As new technology appears, as new software patterns emerge, Relay Developers are purposed with implementing the best available solution for any particular problem while maintaining backwards compatibility. As Relay is not owned by anyone, there is no financial (or otherwise) incentive to anything less than the best practice.



Features:

Relay is a Cloud. By design, Relay has no single points of failure. As the Relay Network grows, more servers around the world will be added to the master list dramatically increasing user capacity and bandwidth. Unlike the Cloud, data redundancy exists on the user clients rather than on the servers, reducing dependence on expensive, fast, high-capacity servers and endless hard drive mirroring.

Relay is a BlockChain. Similar to modern cryptocurrencies, the Relay Network consists of an endless stream of user entries linked by verifiable encryption (a blockchain). Individual entries refer to each other up and down the blockchain and coalesce into meaningful data, which is interpreted by the user’s client. Once something is sent (relayed) across the network, it cannot be altered, faked or lost.

Relay is Push Notification. Contemporary push notification networks tend to operate one-way, from server to client, and tend to require scalable infrastructure. Relay pushes in all directions, server to clients, client to servers, client to clients (thousands, millions, there’s no limit). This translates into a significantly more interactive event-driven internet experience for the end user. Page loads become obsolete and instantaneous. UI becomes the norm. Relay waits for you.

Relay is Encryption. Utilizing PGP (Pretty Good Privacy) Encryption, Relay gives the end user full control over their identity and exposure. PGP Private Keys allow optional passwords, but Relay does not require any passwords to use (It’s a good idea though). PGP Encryption is the lynch pin that makes all of Relay work. For Relay intents and purposes, PGP Encryption offers virtually unbreakable security which operates as logic gates containing and validating KeySpace content as it flows through the Relay network. Relay encryption eliminates the need for old-fashioned peace-of-mind security considerations like firewalls or strong passwords, which can be circumvented even in the best of circumstances.  


Anti-Features:

Relay is not a Walled Garden. Designed to adapt to new technologies as they surface, Relay developers will not close any doors or windows to new ideas, and will resist any attempts by outside influences to wrest control away from the community. Instead, the developers have an obligation to consider to the best available solution, allow competing solutions, benefiting everyone with the power of Community Source.

Relay has no Administration. Instead, Relay is built from the ground-up with cooperation in mind. Typically found in other software are features like moderation, banning, editing of posts, viewing private messages of users, deleting history, censorship, and surveillance to name a few. Relay doesn’t have these, but more to the point, such features are not possible on the Relay Network. Abuse is countered in two major ways: By preventing exposure in the first place, and by making it very difficult to commit yet very easy to ignore. A PGP Identity’s reputation is the determining factor by which KeySpace content is trusted or ignored by the community.


Release Info:

Relay is a work-in-progress and will be launching an invite-only beta in December. Most features are not online as of yet.
Donations: 
BTC: 1AT6o3mmPRZVdzXPh7SbThgAhv9g4o3j92 
PayPal: ari dot asulin at gmail dot com



Instructions for Contributors

(How to contribute to the relay repository)

If you’re viewing this page, hopefully it’s because you want to help contribute to the Relay project (anyone can!). This is accomplished by ‘cloning’ the relay repository to your local computer, making edits, and then committing the changes back to the repo. Changes are then peer-reviewed, authorized and pushed live. 

Contributions include:

.js files (programming) - Javascript files provide all Relay functionality for both Servers and Clients and can be found throughout the source code. 
.html files (content) - HTML5 is the Relay content format. All UI and local content is defined in single .html files throughout the source code.
.css files (design) - CSS is how one makes HTML5 content look (and act) like anything you can think up. CSS files also define Themes used in Relay allowing new themes to be contributed

Repository Instructions:

Install git (the repository manager):
If you already have git, skip this step.
[Windows git] Download cygwin setup.exe from https://www.cygwin.com/ [x86 or x64]
Install with packages ssh, git, python, wget, nano 
Search for each package and select install on each library in the group

Clone the Relay git repository:

After Cygwin is installed (or using your own console/git), open your command console, 
browse (command cd) to your dev directory, 
and execute git clone [repo url]:
$ cd [your dev folder]
$ git clone https://github.com/Protricity/relay





Server Instructions:

(If you want to run a Relay server locally)

Install node.js and mongodb (if you want to run the server locally):

Skip this step if you prefer to run the server remotely. You will need your own server to access the html file i.e. http://[your dev server]/relay/index.html 


Install Node.JS

https://docs.npmjs.com/getting-started/installing-node


Download and Install MongoDB

https://www.mongodb.org/downloads?_ga=1.56315051.1067887463.1444014081#production

Instructions:

http://docs.mongodb.org/manual/tutorial/install-mongodb-on-windows/


Init node libraries:

$ cd [your dev folder]
$ sh init-node.sh


Browse to the relay directory and execute:

$ cd [your dev folder, if you’re still there]
$ node server.js


Try to access your localhost server:

http://localhost/






Testing:

Test in Chrome (edit files via chrome debugger):
Open the index page in chrome on your local server i.e. http://localhost/ (or your own dev server link)
Experiment with the chrome debugger (F12 or Ctrl-Shift-I) which lets you step through client code. This debugger is literally all you need to develop for this project client-side, but feel free to use PHPStorm (way better) or NetBeans, or any javascript IDE
Additional instructions on editing project files from your chrome browser debugger: https://developer.chrome.com/devtools/docs/workspaces 
In the debugger, select the ‘sources’ tab, and right click. Select ‘add folder to workspace’
Select the relay folder you cloned earlier and chrome should be able to sync up the local and remote asset files. Any file edited in real-time is saved locally and can be committed back to the repo.


Directory structure:

/client - Contains all client files (Javascript/HTML5)

/app - Applications and Non-Core features

/channel - Chat and Channel features

/client - Client features and UI

/client/themes - Client Themes and theme resources

/keyspace - KeySpace features and database

/node_modules - Node.js support files

/pgp - PGP Encryption features 

/server/http - HTTP Server

/server/socket - Socket Server 



For Designers:

Open the test page corresponding to a design template in the browser to view
ex. http://localhost:8080/relay-server/command/template/base/pages/home/index.html 
Edit the template by modifying associated css/image files and refreshing the page in the browser
Use test.html files to test individual template components. Add tests as necessary
Commit your changes back to the repo




Please update this file with any questions, improvements on the instructions, or anything else you feel like changing


Clone commands:

$ cd [your dev folder]
$ git clone https://github.com/Protricity/relay

Commit commands:

$ cd [your dev folder]/relay/ 
$ git status (shows the status if your commit)
$ git add [your file path] (add your file to the repo)
$ git commit -m “fixed the thing, added stuff” (commit to repo with message)
$ git push origin master (push commit to server)


cygwin is a unix driver for windows that lets you do many of the same things linux/unix can do on the command line. The command line is called the CygWin Terminal







Feature List (old)
Free and Community Owned
Always free, forever
Cannot be owned, sold, shelved, or reappropriated without the community’s consent
All matters (executive, budget, etc) are audited by the community in real-time

Open-Source
Anyone can contribute
Donations go to contributors of the repository (programmers, designers, content editors, anyone)


Decentralized
No single points of failure
Most features will continue working during outages

Keypair Encryption (with PGP)
The fundamental aspect of what makes Relay possible has to do with client-side encryption. 
All content is signed with the creator’s private key.
Signatures cannot be faked
As information is relayed through the network, the authenticity of that information is constantly verified via the creator’s public key 
Private messages and content encrypted with strong PGP encryption cannot be broken or read by anyone other than the intended recipient. Client-side to Client-side encryption prevents man-in-the-middle attacks as well as anyone (ISP, government, corporations) from snooping your private data


Simple Stack
The Relay client uses a modern browser and is built on JavaScript and HTML5
The Relay 'cache' server uses Javascript also and runs on Node.js and is used to relay socket information and cache http requests


Features
KeySpace
Every User has a User KeySpace defined by their unique PGP Key Identity that can optionally host entire websites and online services from a single device
Content is cached in socket servers so that a host device may be offline for long periods of time without the end users experiencing any outages. 
Small businesses can host all their content for free forever using many available templates, and even serve transactional requests via POST all from a single device
Users may customize (or design from scratch) anything in their KeySpace. They can also select by default templates that resemble existing social media networks (Facebook, Myspace templates, etc)

User Feed
Similar to Myspace/Facebook, any content posted to the User KeySpace also appears on their User Feed. The User Feed is simply a list of all posts made in chronological order. Content access is up to the content creator and managed via PGP Encryption
Similar to other services, the user feed provides common features like comments, signing content (similar to like)


Chatrooms
IRC-styled Chatrooms with HTML5 awesomeness 
Chat rooms provide event push-notification and can act as side-loaded support to all other features built on Relay
Chat rooms can be joined based on locality (country, state, city, house, ip, timezone)

Cryptocurrency integration
Bitcoin (and other currencies) create a user-run economy that operates within the community.
Financial incentive can be used to stimulate such initiatives as voting and software projects

Vote System
Vote initiatives signal community calls to action and can be initiated by any user. 
Voter identity and value is protected via PGP Encryption
Voter fraud is regulated by community audits of vote receipts
Financial incentive can be used to promote a public vote by incentivizing users to vote, review and debate on issues, and audit vote receipts 
Votes are tallied and protected by vote registrars who are responsible for auditing and tallying all votes under their account. This is all handled automatically. In the event of fraud, a review of voter identities is triggered. Failing to do this may result in all votes in the hierarchy becoming invalidated. Anyone can be a vote registrar, but trust comes down to reputation.
Vote receipts are periodically updated with public-facing hashes that do not give away the voter’s identity or vote value, but do allow for duplicate votes to be detected. Fraud that may have gone undetected may be found after the fact when new hash algorithms become available. 


