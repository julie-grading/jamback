const { ActionRowBuilder, SelectMenuBuilder, ComponentType } = require('discord.js');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const { serializeTrack } = require('./tracks');


// might consider destructuring here
async function handleAddToPlaylist(song, interaction, isTrack) {
  const guildId = interaction.guild.id;
  const playlists = await Playlist.getAll(guildId);
  if (!playlists.length) {
    interaction.reply('You don\'t have any playlists. Please create one before trying to add songs.');
    return;
  }
  
  const options = [];
  for(let i = 0; i < playlists.length; ++i) {
    const playlist = playlists[i];
    options.push({
      label: playlist.name,
      value: String(i)
    });
  }
  
  const row = new ActionRowBuilder()
    .addComponents(
      new SelectMenuBuilder()
        .setCustomId('select')
        .setPlaceholder('Nothing selected')
        .addOptions(...options)
    );
  
  const reply = await interaction.reply({
    content: 'Please pick a playlist.',
    components: [row],
    ephemeral: true,
    fetchReply: true
  });
  
  let selectMenuInteraction;
  try {
    selectMenuInteraction = await reply.awaitMessageComponent({
      componentType: ComponentType.SelectMenu
    });
  } catch {
    return;
  }

  if (isTrack) {
    const data = serializeTrack(song);
    try {
      song = await Song.insert(data, guildId, song);
    }
    catch {
      interaction.reply('This song is already in the library. Please add it to playlists by finding it there.');
    }
  }
  
  const playlistIndex = Number(selectMenuInteraction.values[0]);
  const playlist = playlists[playlistIndex];
  
  await playlist.addSongById(song.id);
  
  selectMenuInteraction.reply({
    content: `Successfully added ${song.title} to playlist ${playlist.name}`,
    ephemeral: true
  });
}

module.exports = handleAddToPlaylist;
