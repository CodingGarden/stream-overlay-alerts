// copy this to a file called config.js and update with your oauth token
const config = {
  username: "UserName",
  token: "ABC123",
};

const sounds = {
  host: 'sounds/drop.mp3',
  raid: 'sounds/wavey-piano-with-marimba.mp3',
  sub: 'sounds/guitar-delay.mp3',
  bits: 'sounds/delay-grand-arpeggio.mp3'
};

const soundThresholds = {
  raidMinimum: 0,
  hostMinimum: 1
}

const messages = {
  examples: [
      "",
      "Warmup your keyboards!",
      ["Alerts are ready for action ", "!"],
      {
          message: [" ", " we're ready to go!"],
          sound: sounds.host
      }
  ],
  
  examples: [
    "",
    "Warmup your keyboards!",
    ["Alerts are ready for action ", "!"],
    {
        message: [" ", " we're ready to go!"],
        sound: sounds.host
    }
],

  subGreets: [
      ["Subscriber <span class=\"bold\">", "</span>, is here!"],
      [" Hello subscriber <span class=\"bold\">", "</span>!"],
  ],

  vipGreets: [
      ["VIP <span class=\"bold\">", "</span>, is here!"],
      ["Hello VIP <span class=\"bold\">", "</span>!"],
  ],

  modGreets: [
      ["Moderator <span class=\"bold\">", "</span>, is here!"],
      ["Hello Moderator <span class=\"bold\">", "</span>!"]
  ],

  broadcasterGreets: [
      `Hello Everyone!`,
      'Great to see everyone chatting!'
  ],

  cheerMessages: [
      ["Thank you for the ", " bits <span class=\"bold\">", "</span>!"]
  ],

  subGiftMessages: [
      ["<span class=\"bold\">", "</span>, has gifted ", " subscription(s) to the channel!"]
  ],

  anonGiftPaidUpgradeMessages: [
      ["<span class=\"bold\">", "</span>, upgraded their subscription. (Originally from an anonymous user.)"]
  ],

  giftPaidUpgradeMessages: [
      ["<span class=\"bold\">", "</span>, upgraded their subscription. (Originally from ", ".)"]
  ],

  reSubStreakMessages: [
      ["Thanks for re-subscribing for ", " months <span class=\"bold\">", "</span>."]
  ],

  reSubMessages: [
      ["Thanks for re-subscribing <span class=\"bold\">", "</span>."]
  ],

  subPrimeMessages: [{
      message: ["Thanks for subscribing with Twitch Prime <span class=\"bold\">", "</span>!"],
      sound: sounds.sub
  }],

  subPlanMessages: [{
      message: ["Thanks for the ", " subscription <span class=\"bold\">", "</span>!"],
      sound: sounds.sub
  }],

  subGenericMessages: [{
      message: ["Thanks for the subscription <span class=\"bold\">", "</span>!"],
      sound: sounds.sub
  }],

  hostedMessages: [{
      message: ["<span class=\"bold\">", "</span>, has hosted with ", " viewers!"],
      sound: sounds.host,
  }],

  raidedMessages: [{
      message: ["<span class=\"bold\">", "</span>, has raised with ", " viewers!"],
      sound: sounds.raid,
  }]
}