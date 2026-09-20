const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, WebhookClient, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD1_ID = process.env.GUILD1_ID || '1551202491368997024';
const GUILD2_ID = process.env.GUILD2_ID || '1541919781332975748';
const GUILD1_ROLE_ID = process.env.GUILD1_ROLE_ID || '1551202957993836565';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const EMOJI = '<:bss:1551232769928200355>';
const KEYS_FILE = './keys.json';

// Keys dosyası
if (!fs.existsSync(KEYS_FILE)) fs.writeFileSync(KEYS_FILE, JSON.stringify({}));
function loadKeys() { return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')); }
function saveKeys(k) { fs.writeFileSync(KEYS_FILE, JSON.stringify(k, null, 2)); }
function generateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = 'BSS';
    for (let i = 0; i < 4; i++) {
        key += '-';
        for (let j = 0; j < 4; j++) key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
}

function addEmoji(text) { return text + ' ' + EMOJI; }

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ALT sunucuya katılınca ANA'da rol ver + özel kanal aç
client.on('guildMemberAdd', async member => {
    if (member.guild.id !== GUILD2_ID) return;
    console.log(`[BOT] ${member.user.tag} joined ALT`);
    
    try {
        // 1. ANA sunucuda rol ver
        const mainGuild = await client.guilds.fetch(GUILD1_ID);
        const mainMember = await mainGuild.members.fetch(member.user.id).catch(() => null);
        if (mainMember) {
            await mainMember.roles.add(GUILD1_ROLE_ID);
            console.log(`[BOT] Role given: ${member.user.tag}`);
        }

        // 2. ANA sunucuda özel kanal aç
        try {
            const channel = await mainGuild.channels.create({
                name: `key-${member.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 20),
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: mainGuild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: member.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                    }
                ]
            });

            await channel.send({
                content: addEmoji(`👋 Welcome <@${member.user.id}>!`),
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🔑 Key Generation')
                        .setDescription('Type `/key_generate` in this channel to get your key.\nThen enter it in the script.')
                        .setColor(0x00FF88)
                ]
            });

            // 3. DM gönder
            member.send(addEmoji(`✅ Access granted! Go to <#${channel.id}> in the MAIN server and type \`/key_generate\` to get your key.`)).catch(() => {});
        } catch (e) {
            console.error('[BOT] Channel create error:', e.message);
        }
    } catch (e) {
        console.error('[BOT] Role error:', e.message);
    }
});

// ALT'den çıkınca ANA'dan rol al + kanalı sil
client.on('guildMemberRemove', async member => {
    if (member.guild.id !== GUILD2_ID) return;
    console.log(`[BOT] ${member.user.tag} left ALT`);
    try {
        const mainGuild = await client.guilds.fetch(GUILD1_ID);
        const mainMember = await mainGuild.members.fetch(member.user.id).catch(() => null);
        if (mainMember) await mainMember.roles.remove(GUILD1_ROLE_ID);

        // Özel kanalı sil
        const channels = await mainGuild.channels.fetch();
        const userChannel = channels.find(c => c.name === `key-${member.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 20));
        if (userChannel) await userChannel.delete().catch(() => {});
    } catch (e) { console.error(e.message); }
});

client.once('ready', async () => {
    console.log(`[BOT] ${client.user.tag} ready!`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const commands = [
        new SlashCommandBuilder()
            .setName('reklam')
            .setDescription('Send an ad')
            .addStringOption(o => o.setName('mesaj').setDescription('Ad text').setRequired(true))
            .toJSON(),
        new SlashCommandBuilder()
            .setName('key_generate')
            .setDescription('Generate your key')
            .toJSON(),
        new SlashCommandBuilder()
            .setName('key_list')
            .setDescription('List all keys (admin only)')
            .toJSON(),
        new SlashCommandBuilder()
            .setName('key_delete')
            .setDescription('Delete a key (admin only)')
            .addStringOption(o => o.setName('key').setDescription('Key to delete').setRequired(true))
            .toJSON()
    ];
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD1_ID), { body: commands });
        console.log('[BOT] Commands loaded');
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // /reklam
    if (interaction.commandName === 'reklam') {
        const mesaj = interaction.options.getString('mesaj');
        const embed = new EmbedBuilder()
            .setTitle(addEmoji('🎉 BSS Hub Access'))
            .setDescription(addEmoji(mesaj))
            .setColor(0xFFAA00)
            .addFields({ name: '🔗 Invite Link', value: addEmoji('https://discord.gg/gfsat5Xky9') });
        try {
            const webhook = new WebhookClient({ url: WEBHOOK_URL });
            await webhook.send({ content: addEmoji('New ad!'), embeds: [embed], username: 'BSS Hub' });
            webhook.destroy();
            await interaction.reply({ content: addEmoji('✅ Sent!'), ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: addEmoji('❌ Failed!'), ephemeral: true });
        }
    }

    // /key_generate
    if (interaction.commandName === 'key_generate') {
        const keys = loadKeys();
        // Kullanıcının eski key'i varsa sil
        for (const [k, v] of Object.entries(keys)) {
            if (v.user === interaction.user.id) delete keys[k];
        }
        const newKey = generateKey();
        keys[newKey] = {
            user: interaction.user.id,
            username: interaction.user.username,
            hwid: null,
            createdAt: Date.now()
        };
        saveKeys(keys);

        await interaction.reply({
            content: addEmoji(`✅ Your key has been generated!`),
            embeds: [
                new EmbedBuilder()
                    .setTitle('🔑 Your Key')
                    .setDescription(`\`\`\`${newKey}\`\`\``)
                    .setColor(0x00FF88)
                    .setFooter({ text: 'Enter this in the script' })
            ],
            ephemeral: true
        });
        console.log(`[BOT] Key generated for ${interaction.user.tag}: ${newKey}`);
    }

    // /key_list (admin)
    if (interaction.commandName === 'key_list') {
        const keys = loadKeys();
        const list = Object.entries(keys).map(([k, v]) => `\`${k}\` - <@${v.user}> - HWID: ${v.hwid ? '✅' : '❌'}`).join('\n') || 'No keys';
        await interaction.reply({ content: list.substring(0, 1900), ephemeral: true });
    }

    // /key_delete (admin)
    if (interaction.commandName === 'key_delete') {
        const key = interaction.options.getString('key');
        const keys = loadKeys();
        if (keys[key]) {
            delete keys[key];
            saveKeys(keys);
            await interaction.reply({ content: addEmoji(`✅ Key deleted: \`${key}\``), ephemeral: true });
        } else {
            await interaction.reply({ content: addEmoji('❌ Key not found'), ephemeral: true });
        }
    }
});

client.login(TOKEN);
