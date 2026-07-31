const fs = require('fs');
let content = fs.readFileSync('client/screens/dev-entities.ts', 'utf8');
if (content.includes('type === DroneType.HUMANOID') && content.includes('leftleg')) {
    console.log("It's in there somehow");
} else {
    console.log("Not in there");
}
