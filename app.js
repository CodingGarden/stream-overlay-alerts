let greeted = {};
let haveHosted = {};
let haveRaided = {};

const alerts = document.getElementById("alerts");
const speechBubble = document.getElementById("speech");

if (messageOptions.maxSpeechWidth != 0) {
  speech.setAttribute("style","max-width:"+ messageOptions.maxSpeechWidth +"ch;white-space: normal;overflow: visible;"); 
}

const messageQueue = [];

function playAlertSound(src) {
  const sound = new Audio(src || 'sounds/drop.mp3');

  sound.play();
  sound.addEventListener('ended', () => {
    sound.remove();
  });
}

function generateMessage(message, tokens) {
  var msg = message.message || message;
  var msgText = "";
  var img = (message.image) ? message.image : messageGraphic.default;
  if (msg.length < 1) return "";
  if (typeof (msg) !== "string") {
    const placeTokens = function (item, index) {
      var tokenText = (index < msg.length - 1) ? tokens[index] : "";

      msgText += item += " " + tokenText;
      msgText.trim();
    }
    msg.forEach(placeTokens);
  } else {
    msgText = msg;
  }

  if (typeof(img) !== "string") {
    img = randomItem(img);
  }

  return {
    message: msgText,
    sound: message.sound,
    image: img
  }
}

function randomItem(messages) {
  return messages[Math.floor(Math.random() * messages.length)]
}

const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: true
  },
  identity: {
    username: config.username,
    password: config.token,
  },
  channels: [config.username]
});

client.connect();

client.on('connected', (channel, userstate) => {
  console.log("connected");
  var greets = messages.initialized;
  messageQueue.push(generateMessage(randomItem(greets), [config.username]));
})

client.on('chat', (channel, userstate, message) => {
  if (userstate.username === 'streamlabs') return;
  var args = message.split(" ");
  //Regular Greets
  var greets = [];
  //Subscriber Greets
  if (userstate.badges) {
    if (userstate.badges.hasOwnProperty('subscriber') || userstate.badges.hasOwnProperty('founder')) {
      greets = messages.subGreets;
    }
    //VIP Greets
    if (userstate.badges.hasOwnProperty('vip')) {
      greets = messages.vipGreets;
    }
    //Moderator Greets
    if (userstate.badges.hasOwnProperty('moderator')) {
      greets = messages.modGreets;
    }
    //Broadcaster Greets
    if (userstate.badges.hasOwnProperty('broadcaster')) {
      greets = messages.broadcasterGreets
    }
    if (args[0] == "!speech") {
      if (userstate.badges.hasOwnProperty('broadcaster')) {
        messageQueue.push(message.slice(args[0].length));
        return;
      }
    }
    if (greeted[userstate.username]) return;
    if (greets.length) {
      randomGreet = Math.floor(Math.random() * greets.length)
      greeted[userstate.username] = true;
      messageQueue.push(generateMessage(randomItem(greets), [userstate['display-name']]));
    }
  }
});

client.on('cheer', (channel, userstate, message ) => {
  message= message.substring(message.indexOf(' ')+1, message.length);
  messageQueue.push(
    generateMessage(randomItem(messages.cheerThanks), [userstate.bits, userstate.username, userstate.username, processUserMessage(message)]));
});


let giftTimeout = null;
let lastGifter = '';
let lastGiftAmount = 0;

client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
  if (subgiftCheck = `1`) {
    if (username == lastGifter) {
      clearTimeout(giftTimeout);
      lastGiftAmount++;
    } else {
      lastGifter = username;
      lastGiftAmount = 1;
    }
    giftTimeout = setTimeout(() => {
      messageQueue.push(generateMessage(randomItem(messages.subGiftMessages), [username, lastGiftAmount]));
      lastGiftAmount = 0;
      allRecipients = ``;
    }, 1500);
  }
});
client.on('anongiftpaidupgrade', (channel, username, sender, userstate) => {
  messageQueue.push(generateMessage(randomItem(messages.anonGiftPaidUpgradeMessages), [username]));
});

client.on('giftpaidupgrade', (channel, username, sender, userstate) => {
  messageQueue.push(generateMessage(randomItem(messages.giftPaidUpgradeMessages), [username, sender]));
});

client.on('resub', (channel, username, months, message, userstate, methods) => {
  let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
  if (userstate["msg-param-should-share-streak"] == true) {
    messageQueue.push(generateMessage(randomItem(messages.reSubStreakMessages), [cumulativeMonths, username]));
  } else {
    messageQueue.push(generateMessage(randomItem(messages.reSubMessages), [username]));
  }
});

const planTypes = {
  '2000': 'Tier 2',
  '3000': 'Tier 3',
};

client.on('subscription', (channel, username, { prime, plan, planName}, msg, userstate) => {
  if (prime) {
    subMessage = generateMessage(randomItem(messages.subPrimeMessages), [username]);
  } else if (planTypes[plan]) {
    subMessage = generateMessage(randomItem(messages.subPlanMessages), [planTypes[plan], username]);
  } else {
    subMessage = generateMessage(randomItem(messages.subGenericMessages), [username]);
  }
  messageQueue.push(subMessage);
});

client.on('hosted', (channel, username, viewers, autohost) => {
  if (haveHosted[username]) return;
  haveHosted[username] = true;
  var hostedMessage = generateMessage(randomItem(messages.hostedMessages), [username, viewers]);
  if (viewers < soundThresholds.hostMinimum) {
    delete hostedMessage.sound;
  }
  messageQueue.push(hostedMessage);
});

client.on('raided', (channel, username, viewers) => {
  if (haveRaided[username]) return;
  haveRaided[username] = true;
  var raidedMessage = generateMessage(randomItem(messages.raidedMessage), [username, viewers]);
  if (viewers < soundThresholds.raidMinimum) {
    delete raidedMessage.sound;
  }
  messageQueue.push(raidedMessage);
});

var speechTimer = null;

drawSpeech();

function drawSpeech() {
  if (messageQueue.length) {
    const item = messageQueue.shift();
    msgText = item.message || item;
    if (msgText.length < 1) {
      setTimeout(drawSpeech, 2000);
      return;
    }
    speechBubble.innerHTML = msgText;
    if (item.sound) {
      playAlertSound(item.sound);
    }

    if (item.image) {
      document.getElementById("ani").src = item.image;
    }
    
    clearTimeout(speechTimer)
    alerts.style.opacity = '1';
    alerts.style.transform = 'scale(1)';
    speechTimer = setTimeout(pauseAndFade, 7500)
    setTimeout(drawSpeech, item.message ? 5000 : 2000);
  } else {
    setTimeout(drawSpeech, 2000);
  }
};

function pauseAndFade() {
  alerts.style.opacity = '0';
  alerts.style.transform = 'scale(0)';
};

function processUserMessage (userMessage) {
  if (messageOptions.removeUserMessgeHtml === true) {
      userMessage  = stripHTML(userMessage);
  }
  if (messageOptions.maxUserMessageLength !== 0 && (userMessage.length > messageOptions.maxUserMessageLength)  ) {
    userMessage = userMessage.substring(0,messageOptions.maxUserMessageLength);
  }
  console.log("userMessage:"+userMessage);
  return userMessage;
}

function stripHTML(html){
  let doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}