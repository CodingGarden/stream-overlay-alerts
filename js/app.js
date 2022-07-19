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

const allVoices = window.speechSynthesis.getVoices();
const chosenVoice = allVoices
  .find((voice) => voice.name === 'Microsoft Mark - English (United States)')
   || allVoices[0];

const whiteList = [
  'https://static-cdn.jtvnw.net/',
  'https://d3aqoihi2n8ty8.cloudfront.net/',
  'https://cdn.betterttv.net/emote/',
  'https://cdn.frankerfacez.com/',
];

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.hasAttribute('src')) {
    const src = node.getAttribute('src') || '';
    // TODO: is this always the CDN for emotes???
    if (!whiteList.some((base) => src.startsWith(base))) {
      node.setAttribute('src', '');
    }
  }
});

function playAlertSound(src) {
  if (!src) return;
  const sound = new Audio(src || 'sounds/drop.mp3');

  sound.play();
  sound.addEventListener('ended', () => {
    sound.remove();
  });
}

const streamlabs = io(`wss://sockets.streamlabs.com?token=${config.streamlabs}`);
streamlabs.on('event', (eventData) => {
  if (eventData.type === 'donation') {
    const [message] = eventData.message;
    messageQueue.push({
      message: `<span class="bold">${message.from}</span> has just donated ${message.formatted_amount} ${message.currency}`,
      extraMessage: message.message || '',
      sound: sounds.bits,
      TTS: message.amount >= 5 ? message.message : '',
    });
  }
});

const cheermotes = {};
let cheermoteRegex = null;
async function getCheermotes() {
  const response = await fetch('https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=413856795', {
    headers: {
      Authorization: `Bearer ${config.token}`,
      'client-id': config.clientId,
    },
  });
  const { data } = await response.json();
  let regexString = '';
  data.forEach((cheermote) => {
    cheermotes[cheermote.prefix.toLowerCase()] = cheermote;
    cheermote.tiers.sort((a, b) => b.min_bits - a.min_bits);
    regexString += `${cheermote.prefix}\\d+|`;
  });
  cheermoteRegex = new RegExp(regexString.slice(0, regexString.length - 1), 'ig');
}

getCheermotes();

const client = new tmi.Client({
  options: {
    clientId: config.clientId,
  },
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

async function onCheer(channel, userstate, extraMessage) {
  const originalMessage = extraMessage;
  const parsedMessage = (await parseEmotes(extraMessage, userstate.emotes)) || extraMessage;
  const extraMessageHTML = parsedMessage.replace(cheermoteRegex, (item) => {
    const amount = item.match(/(\d+)/)[1];
    const cheermote = item.replace(amount, '').toLowerCase();
    if (cheermotes[cheermote]) {
      const info = cheermotes[cheermote];
      const tier = info.tiers.find(({ min_bits }) => amount >= min_bits);
      return `<img class="cheer-mote" src="${tier.images.light.animated[2]}">`;
    }
    return item;
  });
  extraMessage = extraMessage.replace(cheermoteRegex, '');
  const amount = parseInt(userstate.bits);
  messageQueue.push({
    message: `Thanks for the ${amount} bits <span class="bold">${userstate.username}</span>!`,
    extraMessage,
    extraMessageHTML,
    TTS: amount >= 500 ? originalMessage : '',
    emotes: userstate.emotes,
    sound: amount >= 100 ? sounds.bits : '',
  });
}
client.on('cheer', onCheer);

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
      // sound: lastGiftAmount >= 2 ? sounds.bits : '',
      sound: sounds.bits,
    });
    lastGiftAmount = 0;
    allRecipients = [];
  }, 1500);
});

client.on('anongiftpaidupgrade', (channel, username) => {
  messageQueue.push({
    message: `<span class="bold">${username}</span>, upgraded their subscription. (Originally from an anonymous user.)`,
    sound: sounds.host,
  });
});

client.on('giftpaidupgrade', (channel, username, sender) => {
  messageQueue.push({
    message: `<span class="bold">${username}</span>, upgraded their subscription. (Originally from ${sender}.)`,
    sound: sounds.host,
  });
});

client.on('resub', async (channel, username, months, extraMessage, userstate, { prime, plan }) => {
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
      sound: sounds.host,
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
      extraMessageHTML: await parseEmotes(extraMessage, userstate.emotes),
      sound: sounds.host,
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
    sound: sounds.host,
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
    sound: sounds.host,
  });
});

client.on('raided', (channel, username, viewers) => {
  if (haveRaided[username]) return;
  haveRaided[username] = true;
  messageQueue.push({
    message: `<span class="bold">${username}</span>, is raiding with ${viewers} viewers!`,
    sound: viewers >= 2 ? sounds.raid : '',
  });
});

let speechTimer = null;

function pauseAndFade() {
  alerts.style.opacity = '0';
  alerts.style.transform = 'scale(0)';
}

async function drawSpeech() {
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
    if (item.TTS) {
      const utterThis = new SpeechSynthesisUtterance(item.TTS);
      utterThis.voice = chosenVoice;
      window.speechSynthesis.speak(utterThis);
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
