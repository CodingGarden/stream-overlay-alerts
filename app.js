let greeted = {};
let haveHosted = {};
let haveRaided = {};

const alerts = document.getElementById("alerts");
const speechBubble = document.getElementById("speech");

const messageQueue = [];

const sounds = {
  host: 'sounds/drop.mp3',
  raid: 'sounds/wavey-piano-with-marimba.mp3',
  sub: 'sounds/guitar-delay.mp3',
  bits: 'sounds/delay-grand-arpeggio.mp3'
};

function playAlertSound(src) {
  const sound = new Audio(src || 'sounds/drop.mp3');

  sound.play();
  sound.addEventListener('ended', () => {
    sound.remove();
  });
}

const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: true
  },
  identity: {
    username: 'codinggarden',
    password: config.token,
  },
  channels: [`codinggarden`]
});

client.connect();

client.on('connected', (channel, userstate) => {
  console.log("connected");
})

client.on('chat', (channel, userstate, message) => {
  if (userstate.username === 'streamlabs') return;
  var args = message.split(" ");
  //Regular Greets
  var greets = [];
  //Subscriber Greets
  if (userstate.badges) {
    if (userstate.badges.hasOwnProperty('subscriber') || userstate.badges.hasOwnProperty('founder')) {
      greets = [
        `Subscriber <span class="bold">${userstate['display-name']}</span>, is digging in the garden again!`,
        `Subscriber <span class="bold">${userstate['display-name']}</span>, has appeared!`,
      ];
    }
    //VIP Greets
    if (userstate.badges.hasOwnProperty('vip')) {
      greets = [
        `VIP <span class="bold">${userstate['display-name']}</span>, has planted themselves!`,
        `Welcome VIP <span class="bold">${userstate['display-name']}</span>, to the garden!.`,
      ];
    }
    //Moderator Greets
    if (userstate.badges.hasOwnProperty('moderator')) {
      greets = [
        `Pruner <span class="bold">${userstate['display-name']}</span>, has appeared in the garden!`,
        `Sharp sheers <span class="bold">${userstate['display-name']}</span> has, keeping the hedges neat!`
      ];
    }
    //Broadcaster Greets
    if (userstate.badges.hasOwnProperty('broadcaster')) {
      greets = [
        `Shh, CJ is talking!`,
        'CJ, appreciates all of his seedlings!'
      ];
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
      messageQueue.push(greets[randomGreet]);
    }
  }
});

client.on('cheer', (channel, userstate) => {
  messageQueue.push({
    message: `Thanks for the ${parseInt(userstate.bits)} bits <span class="bold">${userstate.username}</span>!`,
    sound: sounds.bits,
  });
});


let giftTimeout = null;
let lastGifter = '';
let lastGiftAmount = 0;

const planTypes = {
  '2000': 'Tier 2',
  '3000': 'Tier 3',
};

client.on('subgift', (channel, username, streakMonths, recipient, { prime, plan, planName }, userstate) => {
  if (subgiftCheck = `1`) {
    if (username == lastGifter) {
      clearTimeout(giftTimeout);
      lastGiftAmount++;
    } else {
      lastGifter = username;
      lastGiftAmount = 1;
    }
    giftTimeout = setTimeout(() => {
      if (subTypes[plan]) {
        message = `<span class="Bold">${username}</span>, has gifted ${lastGiftAmount} ${subTypes[plan]} subscription(s) to the garden!`
      } else {
        message = `<span class="bold">${username}</span>, has gifted ${lastGiftAmount} subscription(s) to the garden!`
      }
      messageQueue.push({
        message,
        sound: sounds.bits,
      });
      lastGiftAmount = 0;
      allRecipients = ``;
    }, 1500);
  }
});

client.on('anongiftpaidupgrade', (channel, username, sender, userstate) => {
  messageQueue.push({
    message: `<span class="bold">${username}</span>, upgraded their subscription. (Originally from an anonymous user.)`,
    sound: sounds.sub,
  });
});

client.on('giftpaidupgrade', (channel, username, sender, userstate) => {
  messageQueue.push({
    message: `<span class="bold">${username}</span>, upgraded their subscription. (Originally from ${sender}.)`,
    sound: sounds.sub,
  });
});

client.on('resub', (channel, username, months, message, userstate, { prime, plan, planName }) => {
  let cumulativeMonths = ~~userstate["msg-param-cumulative-months"];
  if (userstate["msg-param-should-share-streak"] == true) {
    if (prime) {
      message = `Thanks for the Twitch Prime resub for ${cumulativeMonths} months <span class="bold">${username}</span>. (Current Streak: ${months})`
    } else if (subTypes[plan]) {
      message = `Thanks for the ${subTypes[plan]} resub for ${cumulativeMonths} months <span class="bold">${username}</span>. (Current Streak: ${months})`
    } else {
      message = `Thanks for the resub for ${cumulativeMonths} months <span class="bold">${username}</span>. (Current Streak: ${months})`
    }
    messageQueue.push({
      message,
      sound: sounds.sub,
    });
  } else {
    if (prime) {
      message = `Thanks for Twitch Prime resub <span class="bold">${username}</span>.`
    } else if (subTypes[plan]) {
      message = `Thanks for the ${subTypes[plan]} resub <span class="bold">${username}</span>.`
    } else {
      message = `Thanks for the resub <span class="bold">${username}</span>.`
    }
    messageQueue.push({
      message,
      sound: sounds.sub,
    });
  }
});

client.on('subscription', (channel, username, { prime, plan, planName }, msg, userstate) => {
  let message = '';
  if (prime) {
    message = `Thanks for subscribing with Twitch Prime <span class="bold">${username}</span>!`;
  } else if (planTypes[plan]) {
    message = `Thanks for the ${planTypes[plan]} subscription <span class="bold">${username}</span>!`;
  } else {
    message = `Thanks for the subscription <span class="bold">${username}</span>!`;
  }
  messageQueue.push({
    message,
    sound: sounds.sub,
  });
});

client.on('primepaidupgrade', (channel, username, { prime, plan, planName }, msg, userstate) => {
  let message = '';
  if (planTypes[plan]) {
    message = `<span class="bold">${username}</span> has upgraded from a Twitch Prime sub to a ${subTypes[plan]}!`;
  } else {
    message = `<span class="bold">${username}</span> has upgraded from a Twitch Prime to a Tier 1 sub!`;
  }
  messageQueue.push({
    message,
    sound: sounds.sub,
  });
});

client.on('hosted', (channel, username, viewers, autohost) => {
  if (haveHosted[username]) return;
  haveHosted[username] = true;
  messageQueue.push({
    message: `<span class="bold">${username}</span>, has hosted with ${viewers} viewers!`,
    sound: viewers > 1 ? sounds.host : '',
  });
});

client.on('raided', (channel, username, viewers) => {
  if (haveRaided[username]) return;
  haveRaided[username] = true;
  messageQueue.push({
    message: `<span class="bold">${username}</span>, is raiding with ${viewers} viewers!`,
    sound: sounds.raid,
  });
});

var speechTimer = null;

drawSpeech();

function drawSpeech() {
  if (messageQueue.length) {
    const item = messageQueue.shift();
    speechBubble.innerHTML = item.message || item;
    if (item.sound) {
      playAlertSound(item.sound);
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
