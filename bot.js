const {
  Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Collection
} = require('discord.js');

const TOKEN = 'put your bot token here';
const CLIENT_ID = '1386072445684813864';
const GUILD_ID = '1374511524273459250';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

const announceCommand = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('Send a DM to selected roles or everyone')
  .addStringOption(option =>
    option.setName('message')
      .setDescription('Message to send in DMs')
      .setRequired(true)
  )
  .addBooleanOption(option =>
    option.setName('everyone')
      .setDescription('Send to everyone in the server')
      .setRequired(false)
  )
  .addStringOption(option =>
    option.setName('roles')
      .setDescription('Mention or type role names (e.g. @Admin @VIP)')
      .setRequired(false)
  );

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('📡 Registering slash command...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [announceCommand.toJSON()] }
    );
    console.log('✅ Slash command registered!');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'announce') return;

  const message = interaction.options.getString('message');
  const everyone = interaction.options.getBoolean('everyone') || false;
  const roleText = interaction.options.getString('roles') || '';

  const guild = await interaction.guild.fetch();
  const allRoles = await interaction.guild.roles.fetch();

  // Parse roles from text input
  const roleNames = roleText
    .match(/<@&\d+>|[\w\- ]+/g)
    ?.map(r => r.replace(/[<@&>]/g, '').trim())
    .filter(Boolean) || [];

  // Find role IDs from input
  const targetRoles = allRoles.filter(role =>
    roleNames.includes(role.id) || roleNames.includes(role.name)
  );

  if (!everyone && targetRoles.size === 0) {
    await interaction.reply({
      content: '❌ No valid roles found. Mention them or type exact names.',
      ephemeral: true
    });
    return;
  }

  await interaction.reply({ content: '📤 Sending DMs...', ephemeral: true });

  const members = await interaction.guild.members.fetch();
  let sent = 0, failed = 0;

  for (const [, member] of members) {
    if (member.user.bot) continue;

    const match =
      everyone ||
      [...targetRoles.values()].some(role => member.roles.cache.has(role.id));

    if (!match) continue;

    try {
      await member.send(`📢 **Announcement from ${interaction.guild.name}**\n\n${message}`);
      sent++;
    } catch {
      failed++;
    }
  }

  await interaction.followUp({
    content: `✅ Sent: ${sent} | ❌ Failed: ${failed}`,
    ephemeral: true
  });
});

client.login(TOKEN);
