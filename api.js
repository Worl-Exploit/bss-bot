const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const app = express();
const TOKEN = process.env.BOT_TOKEN;
const GUILD1_ID = process.env.GUILD1_ID || '1551202491368997024';
const GUILD2_ID = process.env.GUILD2_ID || '1541919781332975748';
const GUILD1_ROLE_ID = process.env.GUILD1_ROLE_ID || '1551202957993836565';
const KEYS_FILE = './keys.json';

// Keys dosyası yoksa oluştur
if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify({}));
}

const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let g1 = null, g2 = null;

bot.once('ready', async () => {
    console.log(`[API] ${bot.user.tag} ready`);
    g1 = await bot.guilds.fetch(GUILD1_ID).catch(() => null);
    g2 = await bot.guilds.fetch(GUILD2_ID).catch(() => null);
    console.log(`[API] Guilds: ${g1?.name} | ${g2?.name}`);
});

// CONFIG ENDPOINT - Client Loader buradan linkleri çeker
app.get('/config', (req, res) => {
    res.json({
        main: "https://discord.gg/89tc6HctyW",
        alt: "https://discord.gg/gfsat5Xky9",
        emoji: "<:bss:1551232769928200355>",
        version: "1.0.0"
    });
});

// VERIFY ENDPOINT - Key + HWID + Discord kontrolü
app.get('/verify', async (req, res) => {
    const { key, hwid, discord_id } = req.query;

    // 1. Key kontrolü
    if (!key) return res.json({ ok: false, error: 'no_key', message: 'Key required' });
    if (!fs.existsSync(KEYS_FILE)) return res.json({ ok: false, error: 'no_keys', message: 'No keys on server' });

    const keys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    const keyData = keys[key];
    if (!keyData) return res.json({ ok: false, error: 'invalid_key', message: 'Invalid key' });

    // 2. HWID kilitleme
    if (keyData.hwid === null || keyData.hwid === undefined) {
        keyData.hwid = hwid || 'unknown';
        keys[key] = keyData;
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
    } else if (keyData.hwid !== hwid) {
        return res.json({ ok: false, error: 'hwid_mismatch', message: 'Key locked to another device' });
    }

    // 3. Discord kontrolü
    if (!g1 || !g2) return res.json({ ok: false, error: 'bot_not_ready', message: 'Bot not ready' });

    const discordId = discord_id || keyData.user;
    try {
        const [m1, m2] = await Promise.all([
            g1.members.fetch(discordId).catch(() => null),
            g2.members.fetch(discordId).catch(() => null)
        ]);
        if (!m1) return res.json({ ok: false, error: 'not_in_main', message: 'Not in MAIN server' });
        if (!m2) return res.json({ ok: false, error: 'not_in_alt', message: 'Not in ALT server' });
        if (!m1.roles.cache.has(GUILD1_ROLE_ID)) return res.json({ ok: false, error: 'no_role', message: 'No role' });
    } catch (e) {
        return res.json({ ok: false, error: 'error', message: e.message });
    }

    return res.json({ ok: true, username: keyData.username });
});

app.listen(process.env.PORT || 3000, () => console.log('[API] Running on port ' + (process.env.PORT || 3000)));
bot.login(TOKEN);
