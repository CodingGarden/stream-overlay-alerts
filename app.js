let greeted = [];

var speechBubble = document.getElementById("speech");
var cj = document.getElementById("cj");
var cjAni = document.getElementById("cj-ani");

const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: true
  },
  channels: [`codinggarden`]
});

client.connect();

client.on('connected', (channel, userstate) => {
  console.log("connected");
})

client.on('chat', (channel, userstate, message) => {
  var args = message.split(" ");
  if (userstate.username == "streamlabs") {
    if (message.includes('Thank you for following')) {
      speechBubble.innerHTML = `${message}`
      drawSpeech();
      return;
    }
  }
  //Regular Greets
  var greets = [
    `Greetings ${userstate['display-name']}, welcome to the garden!`,
    `Welcome seedling ${userstate['display-name']}.`
  ];
  //Subscriber Greets
  if (userstate.badges) {
    if (userstate.badges.hasOwnProperty('subscriber') || userstate.badges.hasOwnProperty('founder')) {
      greets = [
        `Subscriber ${userstate['display-name']}, is digging in the garden again!`,
        `Subscriber ${userstate['display-name']}, has appeared!`,
      ];
    }
    //VIP Greets
    if (userstate.badges.hasOwnProperty('vip')) {
      greets = [
        `VIP ${userstate['display-name']}, has planted themself!`,
        `Welcome VIP ${userstate['display-name']}, to the garden!.`,
      ];
    }
    //Moderator Greets
    if (userstate.badges.hasOwnProperty('moderator')) {
      greets = [
        `Pruner ${userstate['display-name']}, has appeared in the garden!`,
        `Sharp sheers ${userstate['display-name']} has, keeping the hedges neat!`
      ];
    }
    //Broadcaster Greets
    if (userstate.badges.hasOwnProperty('broadcaster')) {
      greets = [
        `Shh, CJ is talking!`,
        'CJ, appreciates everyone of his seedlings!'
      ];
    }
    if (args[0] == "!speech") {
      if (userstate.badges.hasOwnProperty('broadcaster')) {
        speechBubble.innerHTML = `${message.slice(args[0].length)}`;
        drawSpeech();
        return;
      }
    }
  }
  if (greeted.includes(userstate.username)) return;
  randomGreet = Math.floor(Math.random() * greets.length)
  speechBubble.innerHTML = `${greets[randomGreet]}`;
  greeted.push(userstate.username);
  drawSpeech();
});

client.on('cheer', (channel, userstate) => {
  speechBubble.innerHTML = `Thanks for the ${parseInt(userstate.bits)} bits ${userstate.username}!`;
  drawSpeech();
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
      speechBubble.innerHTML = `${username}, has gifted ${lastGiftAmount} subscription(s) to the nest!`;
      drawSpeech();
      lastGiftAmount = 0;
      allRecipients = ``;
    }, 1500);
  }
});

client.on('anongiftpaidupgrade', (channel, username, sender, userstate) => {
  speechBubble.innerHTML = `${username}, upgraded their subscription. (Originally from an anonymous user.)`;
  drawSpeech();
});

client.on('giftpaidupgrade', (channel, username, sender, userstate) => {
  speechBubble.innerHTML = `${username}, upgraded their subscription. (Originally from ${sender}.)`;
  drawSpeech();
});

client.on('resub', (channel, username, months, message, userstate, methods) => {
  let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
  if (userstate["msg-param-should-share-streak"] = true) {
    speechBubble.innerHTML = `Thanks for re-subscribing for ${cumulativeMonths} months ${username}.`;
    drawSpeech();
  } else {
    speechBubble.innerHTML = `Thanks for re-subscribing ${username}.`;
    drawSpeech();
  }
});

client.on('subscription', (channel, username, { prime, plan, planName }, msg, userstate) => {
  speechBubble.innerHTML = `Thanks for subscribing ${username}!`;
  drawSpeech();
});

client.on('hosted', (channel, username, viewers, autohost) => {
  speechBubble.innerHTML = `${username}, has hosted with ${viewers} viewers.`;
  drawSpeech();
});

client.on('raided', (channel, username, viewers) => {
  speechBubble.innerHTML = `${username}, has raided with ${viewers} viewers.`;
  drawSpeech();
});

var speechTimer = null;

function drawSpeech() {
  clearTimeout(speechTimer)
  cj.style.visibility = 'hidden';
  cjAni.style.visibility = 'visible';
  speechBubble.style.visibility = 'visible';
  speechBubble.style.animation = 'none';
  speechTimer = setTimeout(pauseAndFade, 7500)
};

function pauseAndFade() {
  cj.style.visibility = 'visible';
  cjAni.style.visibility = 'hidden';
  speechBubble.style.visibility = 'hidden';
  speechBubble.style.animation = 'fadeout 1s';
};
