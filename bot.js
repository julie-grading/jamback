/* eslint-disable no-console */
const { Client, GatewayIntentBits } = require('discord.js');
const { Manager } = require('erela.js');
const play = require('./lib/commands/play');
const search = require('./lib/commands/search');
const playlist = require('./lib/commands/playlist');

if (!process.env.DISCORD_BOT_TOKEN) {
  console.log('Please remember to add your token to the .env file');
  return;
}

// Initialize the Discord.JS Client.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Initiate the Manager with some options and listen to some events.
client.manager = new Manager({
  nodes: [
    {
      host: process.env.LL_HOST,
      port: Number(process.env.LL_PORT),
      password: process.env.LL_PASSWORD,
      secure: Boolean(process.env.LL_SECURE),
    },
  ],
  // A send method to send data to the Discord WebSocket using your library.
  // Getting the shard for the guild and sending the data to the WebSocket.
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  },
});

client.manager.on('nodeConnect', (node) =>
  console.log(`Node ${node.options.identifier} connected`)
);

client.manager.on('nodeError', (node, error) =>
  console.log(
    `Node ${node.options.identifier} had an error: ${error.message}`
  )
);

client.manager.on('trackStart', (player, track) => {
  client.channels.cache
    .get(player.textChannel)
    .send(`Now playing: ${track.title}`);
});

client.manager.on('queueEnd', (player) => {
  client.channels.cache.get(player.textChannel).send('Queue has ended.');

  player.destroy();
});

// Ready event fires when the Discord.JS client is ready.
// Use EventEmitter#once() so it only fires once.
client.once('ready', () => {
  console.log('I am ready!');
  // Initiate the manager.
  client.manager.init(client.user.id);
});

// Here we send voice data to lavalink whenever the bot joins a voice channel to play audio in the channel.
client.on('raw', (d) => client.manager.updateVoiceState(d));

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  switch (interaction.commandName) {
    case 'play':
      await play(client, interaction);
      break;
    case 'search':
      await search(client, interaction);
      break;
    case 'playlist':
      await playlist(client, interaction);
      break;
    case 'test':
    {
      const results = ['result 1', 'result 2', 'result 3'];
      let index = 0;

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('play')
            .setLabel('Play')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('save')
            .setLabel('Save')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary),
        );

      const interactionResponse = await interaction.reply({ content: results[index], components: [row], ephemeral: true });

      // Collect a message component interaction
      const collector = interactionResponse.createMessageComponentCollector({
        filter: (x) => x.isButton(),
        idle: 10_000
      });
      collector.on('collect', interaction => {
        collector.resetTimer();
        interaction.update(String(++index));
      });
      collector.on('end', () => {
        interactionResponse.interaction.editReply({ components: [] });
      });

      break;
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
