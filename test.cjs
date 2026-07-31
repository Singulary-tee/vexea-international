const fs = require('fs');
let content = fs.readFileSync('client/screens/dev-entities.ts', 'utf8');
if (content.includes('leftleg')) {
    console.log("leftleg is in there");
}
if (content.includes('makeRotationX(Math.sin(walk) * 0.6)')) {
    console.log("makeRotationX is in there");
}
