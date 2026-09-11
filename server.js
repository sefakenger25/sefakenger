const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'sefa_kenger_ozel_gizli_anahtar',
    resave: false,
    saveUninitialized: false
}));

const db = new sqlite3.Database('./site_data.db');

// Veritabanı Mimarisi
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY,
        html_content TEXT
    )`);
    
    // Varsayılan HTML Şablonu (Sefa Kenger - birinsaat tarzı başlangıç kodu)
    db.get("SELECT COUNT(*) as count FROM pages", (err, row) => {
        if (row.count === 0) {
            const defaultHTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Sefa Kenger - İnşaat & Mimarlık</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; color: #333; }
        header { background: #1e293b; color: white; padding: 20px; text-align: center; }
        .container { padding: 40px; max-width: 1000px; margin: auto; background: white; }
        .blog-post { border-bottom: 1px solid #ddd; padding-bottom: 20px; margin-bottom: 20px; }
        h1 { color: #1e293b; }
    </style>
</head>
<body>
    <header>
        <h1>Sefa Kenger</h1>
        <p>İnşaat, Proje Yönetimi & Mimari Çözümler</p>
    </header>
    <div class="container">
        <h2>Günlük Blog & Saha Notları</h2>
        <div class="blog-post">
            <h3>Hoş Geldiniz</h3>
            <p>Bugün şantiyede incelediğimiz yalıtım detayları ve proje notları yakında burada olacak...</p>
        </div>
    </div>
</body>
</html>`;
            db.run("INSERT INTO pages (id, html_content) VALUES (1, ?)", [defaultHTML]);
        }
    });
});

// 1. ZİYARETÇİLERİN GÖRDÜĞÜ ANA SAYFA
app.get('/', (req, res) => {
    db.get("SELECT html_content FROM pages WHERE id = 1", (err, row) => {
        if (err || !row) return res.send("Site yüklenirken hata oluştu.");
        res.send(row.html_content);
    });
});

// 2. ADMİN GİRİŞ SAYFASI
app.get('/login', (req, res) => {
    res.send(`
        <form action="/login" method="POST" style="max-width:300px;margin:100px auto;font-family:sans-serif;">
            <h2>Sefa Kenger Panel Girişi</h2>
            <input type="text" name="user" placeholder="Kullanıcı Adı" required style="width:100%;margin-bottom:10px;padding:8px;"><br>
            <input type="password" name="pass" placeholder="Şifre" required style="width:100%;margin-bottom:10px;padding:8px;"><br>
            <button type="submit" style="width:100%;padding:10px;background:#1e293b;color:white;border:none;">Giriş Yap</button>
        </form>
    `);
});

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    // Kullanıcı Adı: sefa | Şifre: kenger123
    if (user === 'sefa' && pass === 'kenger123') {
        req.session.admin = true;
        res.redirect('/admin');
    } else {
        res.send("Hatalı kullanıcı adı veya şifre! <a href='/login'>Tekrar Dene</a>");
    }
});

// 3. CANLI HTML DÜZENLEME VE DÜZELTME PANELİ
app.get('/admin', (req, res) => {
    if (!req.session.admin) return res.redirect('/login');
    
    db.get("SELECT html_content FROM pages WHERE id = 1", (err, row) => {
        res.send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Sefa Kenger - HTML Düzenleme Paneli</title>
            <style>
                body { margin: 0; font-family: monospace; display: flex; flex-direction: column; height: 100vh; }
                .toolbar { background: #1e293b; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; }
                .main { display: flex; flex: 1; }
                textarea { width: 50%; height: 100%; p-3; border: none; background: #0f172a; color: #00ff66; padding: 15px; font-size: 14px; box-sizing: border-box; }
                iframe { width: 50%; height: 100%; border: none; background: white; }
                button { background: #22c55e; color: white; border: none; padding: 10px 20px; cursor: pointer; font-weight: bold; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <span><b>Sefa Kenger</b> - HTML Düzenleme & Düzelme Paneli</span>
                <button onclick="saveHTML()">KAYDET VE CANLIYA AL</button>
            </div>
            <div class="main">
                <textarea id="code" oninput="updatePreview()">${row ? row.html_content : ''}</textarea>
                <iframe id="preview"></iframe>
            </div>
            <script>
                function updatePreview() {
                    const code = document.getElementById('code').value;
                    const preview = document.getElementById('preview').contentWindow.document;
                    preview.open();
                    preview.write(code);
                    preview.close();
                }
                updatePreview();

                async function saveHTML() {
                    const code = document.getElementById('code').value;
                    const res = await fetch('/api/save', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ html: code })
                    });
                    if(res.ok) alert('Web siteniz başarıyla güncellendi!');
                }
            </script>
        </body>
        </html>
        `);
    });
});

// HTML KAYDETME API
app.post('/api/save', (req, res) => {
    if (!req.session.admin) return res.status(403).send("Yetkisiz erişim");
    const { html } = req.body;
    db.run("UPDATE pages SET html_content = ? WHERE id = 1", [html], (err) => {
        if (err) return res.status(500).send("Hata");
        res.send({ status: "ok" });
    });
});

app.listen(3000, () => console.log('Panel ve Site 3000 portunda hazır!'));
