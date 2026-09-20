const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, WebhookClient } = require('discord.js');

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD1_ID = process.env.GUILD1_ID || '1551202491368997024';
const GUILD2_ID = process.env.GUILD2_ID || '1541919781332975748';
const GUILD1_ROLE_ID = process.env.GUILD1_ROLE_ID || '1551202957993836565';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const EMOJI = '<:bss:1551232769928200355>';

function addEmoji(text) { return text + ' ' + EMOJI; }

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.on('guildMemberAdd', async member => {
    if (member.guild.id !== GUILD2_ID) return;
    console.log(`[BOT] ${member.user.tag} joined ALT server`);
    try {
        const mainGuild = await client.guilds.fetch(GUILD1_ID);
        const mainMember = await mainGuild.members.fetch(member.user.id).catch(() => null);
        if (mainMember) {
            await mainMember.roles.add(GUILD1_ROLE_ID);
            console.log(`[BOT] Role given: ${member.user.tag}`);
            member.send(addEmoji('✅ BSS Hub access granted!')).catch(() => {});
        } else {
            member.send(addEmoji('⚠️ Join MAIN server too!\nhttps://discord.gg/89tc6HctyW')).catch(() => {});
        }
    } catch (e) { console.error('Role error:', e.message); }
});

client.on('guildMemberRemove', async member => {
    if (member.guild.id !== GUILD2_ID) return;
    try {
        const mainGuild = await client.guilds.fetch(GUILD1_ID);
        const mainMember = await mainGuild.members.fetch(member.user.id).catch(() => null);
        if (mainMember) await mainMember.roles.remove(GUILD1_ROLE_ID);
    } catch (e) { console.error(e.message); }
});

client.once('ready', async () => {
    console.log(`[BOT] ${client.user.tag} ready!`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const commands = [
        new SlashCommandBuilder()
            .setName('reklam')
            .setDescription('Send ad')
            .addStringOption(o => o.setName('mesaj').setDescription('Ad text').setRequired(true))
            .toJSON()
    ];
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD1_ID), { body: commands });
        console.log('[BOT] Commands loaded');
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'reklam') {
        const mesaj = interaction.options.getString('mesaj');
        const embed = new EmbedBuilder()
            .setTitle(addEmoji('🎉 BSS Hub Access'))
            .setDescription(addEmoji(mesaj))
            .setColor(0xFFAA00)
            .addFields({ name: '🔗 Invite', value: addEmoji('https://discord.gg/gfsat5Xky9') });
        try {
            const webhook = new WebhookClient({ url: WEBHOOK_URL });
            await webhook.send({ content: addEmoji('New ad!'), embeds: [embed], username: 'BSS Hub' });
            webhook.destroy();
            await interaction.reply({ content: addEmoji('✅ Sent!'), ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: addEmoji('❌ Failed!'), ephemeral: true });
        }
    }
});

client.login(TOKEN);