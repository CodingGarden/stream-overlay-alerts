const greeted = {};
const haveHosted = {};
const haveRaided = {};

const alerts = document.getElementById('alerts');
const speechBubble = document.getElementById('speech');

const messageQueue = [];

const sounds = {
  host: 'sounds/drop.mp3',
  raid: 'sounds/wavey-piano-with-marimba.mp3',
  sub: 'sounds/guitar-delay.mp3',
  bits: 'sounds/delay-grand-arpeggio.mp3',
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.hasAttribute('src')) {
    const src = node.getAttribute('src') || '';
    // TODO: is this always the CDN for emotes???
    if (!src.startsWith('https://d3aqoihi2n8ty8.cloudfront.net/')) {
      node.setAttribute('src', '');
    }
  }
});

function playAlertSound(src) {
  const sound = new Audio(src || 'sounds/drop.mp3');

  sound.play();
  sound.addEventListener('ended', () => {
    sound.remove();
  });
}

const streamlabs = io(`wss://sockets.streamlabs.com?token=${config.streamlabs}`);
streamlabs.on('event', (eventData) => {
  if (eventData.for === 'streamlabs' && eventData.type === 'donation') {
    const theDonator = eventData.message[0].from;
    const theAmount = eventData.message[0].formatted_amount;
    const theCurrency = eventData.message[0].currency;
    const theMessage = eventData.message[0].message;
    messageQueue.push({
      message: `<span class="bold">${theDonator}</span> has just donated ${theAmount} ${theCurrency}`,
      extraMessage: theMessage || '',
      sound: sounds.bits,
    });
  }
});

const teamMembers = {};
async function getTeamMembers() {
  const response = await fetch('https://api.twitch.tv/kraken/teams/' + config.team, {
    headers: {
      'Client-ID': config.clientId,
      Accept: 'application/vnd.twitchtv.v5+json',
    },
  });
  const data = await response.json();
  for (i = 0; i < data.users.length; i++) {
    teamMembers[data.users[i].name] = true;
  }
}

getTeamMembers();

const cheermotes = {};
let cheermoteRegex = null;
async function getCheermotes() {
  const response = await fetch('https://api.twitch.tv/helix/bits/cheermotes', {
    headers: {
      Authorization: `Bearer ${config.token}`,
      'client-id': config.clientId,
    },
  });
  const { data } = await response.json();
  let regexString = '';
  data.forEach((cheermote) => {
    cheermotes[cheermote.prefix] = cheermote;
    cheermote.tiers.sort((a, b) => b.min_bits - a.min_bits);
    regexString += `${cheermote.prefix}\\d+|`;
  });
  cheermoteRegex = new RegExp(regexString.slice(0, regexString.length - 1), 'ig');
}

getCheermotes();

const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: true,
  },
  identity: {
    username: 'codinggarden',
    password: config.token,
  },
  channels: ['codinggarden'],
});

client.connect();

client.on('connected', () => {
  console.log('connected');
});

client.on('chat', (channel, userstate, message) => {
  if (userstate.username === 'streamlabs') return;
  const args = message.split(' ');
  // Regular Greets
  let greets = [];
  let teamBadge = '';
  if (teamMembers[userstate.username]) {
    teamBadge = `<img class="team-badge" src="assets/livecoders.png" />`;
    greets = [
      `${teamBadge}Livecoders Team Member <span class="bold">${userstate['display-name']}</span>, detected!`,
    ];
  }
  // Subscriber Greets
  if (userstate.badges) {
    if (userstate.badges.hasOwnProperty('subscriber') || userstate.badges.hasOwnProperty('founder')) {
      greets = [
        `Subscriber ${teamBadge}<span class="bold">${userstate['display-name']}</span>, is digging in the garden again!`,
        `Subscriber ${teamBadge}<span class="bold">${userstate['display-name']}</span>, has appeared!`,
      ];
    }
    // VIP Greets
    if (userstate.badges.hasOwnProperty('vip')) {
      greets = [
        `VIP ${teamBadge}<span class="bold">${userstate['display-name']}</span>, has planted themselves!`,
        `Welcome VIP ${teamBadge}<span class="bold">${userstate['display-name']}</span>, to the garden!.`,
      ];
    }
    // Moderator Greets
    if (userstate.badges.hasOwnProperty('moderator')) {
      greets = [
        `Pruner ${teamBadge}<span class="bold">${userstate['display-name']}</span>, has appeared in the garden!`,
        `Sharp sheers ${teamBadge}<span class="bold">${userstate['display-name']}</span> has, keeping the hedges neat!`,
      ];
    }
    // Broadcaster Greets
    if (userstate.badges.hasOwnProperty('broadcaster')) {
      greets = [
        'Shh, CJ is talking!',
        'CJ, appreciates all of his seedlings!',
      ];
    }
    if (args[0] == '!speech') {
      if (userstate.badges.hasOwnProperty('broadcaster')) {
        messageQueue.push(message.slice(args[0].length));
        return;
      }
    }
    if (greeted[userstate.username]) return;
    if (greets.length) {
      const randomGreet = Math.floor(Math.random() * greets.length);
      greeted[userstate.username] = true;
      messageQueue.push(greets[randomGreet]);
    }
  }
});

client.on('cheer', (channel, userstate, extraMessage) => {
  const extraMessageHTML = extraMessage.replace(cheermoteRegex, (item) => {
    const amount = item.match(/(\d+)/)[1];
    const cheermote = item.replace(amount, '');
    if (cheermotes[cheermote]) {
      const info = cheermotes[cheermote];
      const tier = info.tiers.find(({ min_bits }) => amount >= min_bits);
      return `<img class="cheer-mote" src="${tier.images.light.animated[2]}">`;
    }
    return item;
  });
  extraMessage = extraMessage.replace(cheermoteRegex, '');
  messageQueue.push({
    message: `Thanks for the ${parseInt(userstate.bits)} bits <span class="bold">${userstate.username}</span>!`,
    extraMessage,
    extraMessageHTML,
    sound: sounds.bits,
  });
});

let giftTimeout = null;
let lastGifter = '';
let lastGiftAmount = 0;
let allRecipients = [];

const planTypes = {
  2000: 'Tier 2',
  3000: 'Tier 3',
};

client.on('subgift', (channel, username, streakMonths, recipient, { plan }) => {
  if (username == lastGifter) {
    clearTimeout(giftTimeout);
    lastGiftAmount++;
  } else {
    lastGifter = username;
    lastGiftAmount = 1;
  }
  allRecipients.push(recipient);
  giftTimeout = setTimeout(() => {
    let message = '';
    if (planTypes[plan]) {
      message = `<span class="Bold">${username}</span>, has gifted ${lastGiftAmount} ${planTypes[plan]} subscription(s) to the garden! Congrats to: ${allRecipients.join(', ')}`;
    } else {
      message = `<span class="bold">${username}</span>, has gifted ${lastGiftAmount} subscription(s) to the garden! Congrats to: ${allRecipients.join(', ')}`;
    }
    messageQueue.push({
      message,
      sound: sounds.bits,
    });
    lastGiftAmount = 0;
    allRecipients = [];
  }, 1500);
});

client.on('anongiftpaidupgrade', (channel, username) => {
  messageQueue.push({
    message: `<span class="bold">${username}</span>, upgraded their subscription. (Originally from an anonymous user.)`,
    sound: sounds.sub,
  });
});

client.on('giftpaidupgrade', (channel, username, sender) => {
  messageQueue.push({
    message: `<span class="bold">${username}</span>, upgraded their subscription. (Originally from ${sender}.)`,
    sound: sounds.sub,
  });
});

client.on('resub', (channel, username, months, extraMessage, userstate, { prime, plan }) => {
  const cumulativeMonths = ~~userstate['msg-param-cumulative-months'];
  if (userstate['msg-param-should-share-streak'] == true) {
    let message = '';
    if (prime) {
      message = `Thanks for the Twitch Prime resub for ${cumulativeMonths} months <span class="bold">${username}</span>. (Current Streak: ${months})`;
    } else if (planTypes[plan]) {
      message = `Thanks for the ${planTypes[plan]} resub for ${cumulativeMonths} months <span class="bold">${username}</span>. (Current Streak: ${months})`;
    } else {
      message = `Thanks for the resub for ${cumulativeMonths} months <span class="bold">${username}</span>. (Current Streak: ${months})`;
    }
    messageQueue.push({
      message,
      extraMessage,
      sound: sounds.sub,
    });
  } else {
    let message = '';
    if (prime) {
      message = `Thanks for Twitch Prime resub <span class="bold">${username}</span>.`;
    } else if (planTypes[plan]) {
      message = `Thanks for the ${planTypes[plan]} resub <span class="bold">${username}</span>.`;
    } else {
      message = `Thanks for the resub <span class="bold">${username}</span>.`;
    }
    messageQueue.push({
      message,
      extraMessage,
      sound: sounds.sub,
    });
  }
});

client.on('subscription', (channel, username, { prime, plan }) => {
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

client.on('primepaidupgrade', (channel, username, { plan }) => {
  let message = '';
  if (planTypes[plan]) {
    message = `<span class="bold">${username}</span> has upgraded from a Twitch Prime sub to a ${planTypes[plan]}!`;
  } else {
    message = `<span class="bold">${username}</span> has upgraded from a Twitch Prime to a Tier 1 sub!`;
  }
  messageQueue.push({
    message,
    sound: sounds.sub,
  });
});

client.on('hosted', (channel, username, viewers) => {
  if (haveHosted[username]) return;
  haveHosted[username] = true;
  messageQueue.push({
    message: `<span class="bold">${username}</span>, has hosted with ${viewers} viewers!`,
    sound: viewers > 2 ? sounds.host : '',
  });
});

client.on('raided', (channel, username, viewers) => {
  if (haveRaided[username]) return;
  haveRaided[username] = true;
  messageQueue.push({
    message: `<span class="bold">${username}</span>, is raiding with ${viewers} viewers!`,
    sound: viewers > 2 ? sounds.raid : '',
  });
});

let speechTimer = null;

function pauseAndFade() {
  alerts.style.opacity = '0';
  alerts.style.transform = 'scale(0)';
}

function drawSpeech() {
  if (messageQueue.length) {
    const item = messageQueue.shift();
    speechBubble.innerHTML = item.message || item;
    if (item.extraMessage || item.extraMessageHTML) {
      speechBubble.innerHTML += '<br />';
      const messageElement = document.createElement('span');
      messageElement.classList.add('cheer-message');
      if (item.extraMessageHTML) {
        messageElement.innerHTML = DOMPurify
          .sanitize(item.extraMessageHTML, {
            ALLOWED_TAGS: ['img'],
          });
      } else {
        messageElement.textContent = item.extraMessage;
      }
      speechBubble.append(messageElement);
    }
    if (item.sound) {
      playAlertSound(item.sound);
    }
    clearTimeout(speechTimer);
    alerts.style.opacity = '1';
    alerts.style.transform = 'scale(1)';
    speechTimer = setTimeout(pauseAndFade, 7500);
    setTimeout(drawSpeech, item.message ? 5000 : 2000);
  } else {
    setTimeout(drawSpeech, 2000);
  }
}

drawSpeech();
