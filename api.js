const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const TOKEN = process.env.BOT_TOKEN;
const GUILD1_ID = process.env.GUILD1_ID || '1551202491368997024';
const GUILD2_ID = process.env.GUILD2_ID || '1541919781332975748';
const GUILD1_ROLE_ID = process.env.GUILD1_ROLE_ID || '1551202957993836565';

const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let g1 = null, g2 = null;

bot.once('ready', async () => {
    console.log(`[API] ${bot.user.tag} ready`);
    g1 = await bot.guilds.fetch(GUILD1_ID).catch(() => null);
    g2 = await bot.guilds.fetch(GUILD2_ID).catch(() => null);
});

app.get('/verify', async (req, res) => {
    const { discord_id } = req.query;
    if (!discord_id) return res.json({ ok: false, error: 'no_id', message: 'Discord ID required' });
    if (!g1 || !g2) return res.json({ ok: false, error: 'bot_not_ready', message: 'Bot not ready' });
    try {
        const [m1, m2] = await Promise.all([
            g1.members.fetch(discord_id).catch(() => null),
            g2.members.fetch(discord_id).catch(() => null)
        ]);
        if (!m1) return res.json({ ok: false, error: 'not_in_main', message: 'Not in MAIN server' });
        if (!m2) return res.json({ ok: false, error: 'not_in_alt', message: 'Not in ALT server' });
        if (!m1.roles.cache.has(GUILD1_ROLE_ID)) return res.json({ ok: false, error: 'no_role', message: 'No role' });
        return res.json({ ok: true, username: m1.user.username });
    } catch (e) {
        return res.json({ ok: false, error: 'error', message: e.message });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('[API] Running'));
bot.login(TOKEN);