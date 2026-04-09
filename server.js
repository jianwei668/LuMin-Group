const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = !!process.env.VERCEL;

// JWT secret — MUST set via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

// Simple brute-force protection
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const ADMIN_FILE = path.join(DATA_DIR, '_admin.json');

// ========== STORAGE ABSTRACTION ==========

var _blob = null;
function getBlob() {
  if (!_blob) _blob = require('@vercel/blob');
  return _blob;
}

async function readDataFile(name) {
  if (isVercel) {
    try {
      var blobMod = getBlob();
      var result = await blobMod.list({ prefix: 'data/' + name + '.json' });
      var exact = result.blobs.find(function (b) { return b.pathname === 'data/' + name + '.json'; });
      if (exact) {
        var res = await fetch(exact.url);
        return await res.json();
      }
    } catch (e) {
      console.error('Blob read error:', e.message);
    }
  }
  var filePath = path.join(DATA_DIR, name + '.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return null;
}

async function writeDataFile(name, data) {
  if (isVercel) {
    var blobMod = getBlob();
    await blobMod.put('data/' + name + '.json', JSON.stringify(data, null, 2), {
      access: 'public',
      addRandomSuffix: false,
    });
  } else {
    var filePath = path.join(DATA_DIR, name + '.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

async function getAdmin() {
  if (isVercel) {
    // Prefer environment variables (most secure)
    var envUser = process.env.ADMIN_USERNAME;
    var envHash = process.env.ADMIN_PASSWORD_HASH;
    if (envUser && envHash) {
      return { username: envUser, password: envHash };
    }
    // Try Blob storage
    try {
      var blobMod = getBlob();
      var result = await blobMod.list({ prefix: 'data/_admin.json' });
      var exact = result.blobs.find(function (b) { return b.pathname === 'data/_admin.json'; });
      if (exact) {
        var res = await fetch(exact.url);
        return await res.json();
      }
    } catch (e) {
      console.error('Admin read error:', e.message);
    }
    // Create default admin in Blob
    var hash = bcrypt.hashSync('admin123', 10);
    var admin = { username: 'admin', password: hash };
    try {
      getBlob().put('data/_admin.json', JSON.stringify(admin, null, 2), {
        access: 'public', addRandomSuffix: false,
      });
    } catch (_e) { /* ignore */ }
    return admin;
  }
  // Local filesystem
  if (!fs.existsSync(ADMIN_FILE)) {
    var hash2 = bcrypt.hashSync('admin123', 10);
    var admin2 = { username: 'admin', password: hash2 };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin2, null, 2), 'utf-8');
    return admin2;
  }
  return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
}

async function saveAdmin(adminData) {
  if (isVercel) {
    var blobMod = getBlob();
    await blobMod.put('data/_admin.json', JSON.stringify(adminData, null, 2), {
      access: 'public', addRandomSuffix: false,
    });
  } else {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2), 'utf-8');
  }
}

// ========== MIDDLEWARE ==========

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Block access to sensitive files
app.use('/data/_admin.json', function (req, res) { return res.status(403).end(); });

// Serve static files (local dev only; Vercel CDN handles this in production)
if (!isVercel) {
  app.use(express.static(__dirname, {
    index: 'index.html',
    extensions: ['html'],
    dotfiles: 'deny'
  }));
}

// Auth middleware
function authMiddleware(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权访问' });
  }
  var token = authHeader.slice(7);
  try {
    var decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

// ========== IMAGE UPLOAD CONFIG ==========

var diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    var uploadDir = path.join(__dirname, 'images');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname).toLowerCase();
    var allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('不支持的文件格式（仅支持 jpg/png/gif/webp）'));
    }
    var safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safeName);
  }
});

var fileFilter = function (req, file, cb) {
  var allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('不支持的文件类型'));
};

var uploadLocal = multer({ storage: diskStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: fileFilter });
var uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: fileFilter });

// ========== AUTH ROUTES ==========

app.post('/api/login', async function (req, res) {
  var ip = req.ip || req.connection.remoteAddress;
  var now = Date.now();
  var attempts = loginAttempts.get(ip);

  if (attempts && attempts.count >= MAX_ATTEMPTS && now - attempts.lastAttempt < LOCKOUT_MS) {
    var remaining = Math.ceil((LOCKOUT_MS - (now - attempts.lastAttempt)) / 60000);
    return res.status(429).json({ error: '登录尝试次数过多，请 ' + remaining + ' 分钟后再试' });
  }

  var username = req.body.username;
  var password = req.body.password;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  try {
    var admin = await getAdmin();
    var valid = username === admin.username && bcrypt.compareSync(password, admin.password);

    if (!valid) {
      var current = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
      if (now - current.lastAttempt > LOCKOUT_MS) current.count = 0;
      current.count++;
      current.lastAttempt = now;
      loginAttempts.set(ip, current);
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    loginAttempts.delete(ip);
    var token = jwt.sign({ username: username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token: token, username: username });
  } catch (err) {
    res.status(500).json({ error: '登录失败: ' + err.message });
  }
});

app.post('/api/change-password', authMiddleware, async function (req, res) {
  var oldPassword = req.body.oldPassword;
  var newPassword = req.body.newPassword;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请填写旧密码和新密码' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少 6 个字符' });
  }

  try {
    var admin = await getAdmin();
    if (!bcrypt.compareSync(oldPassword, admin.password)) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    admin.password = bcrypt.hashSync(newPassword, 10);
    await saveAdmin(admin);
    res.json({ message: '密码修改成功' });
  } catch (err) {
    res.status(500).json({ error: '操作失败: ' + err.message });
  }
});

// ========== DATA ROUTES ==========

var DATA_FILES = ['hero', 'research', 'publications', 'news', 'members', 'about', 'contact', 'site'];

app.get('/api/data/:name', async function (req, res) {
  var name = req.params.name;
  if (!DATA_FILES.includes(name)) {
    return res.status(404).json({ error: '数据文件不存在' });
  }
  try {
    var data = await readDataFile(name);
    if (!data) return res.status(404).json({ error: '数据文件不存在' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '读取失败: ' + err.message });
  }
});

app.put('/api/data/:name', authMiddleware, async function (req, res) {
  var name = req.params.name;
  if (!DATA_FILES.includes(name)) {
    return res.status(404).json({ error: '数据文件不存在' });
  }
  try {
    await writeDataFile(name, req.body);
    res.json({ message: '保存成功' });
  } catch (err) {
    res.status(500).json({ error: '保存失败: ' + err.message });
  }
});

// ========== IMAGE ROUTES ==========

app.post('/api/upload', authMiddleware, function (req, res) {
  var middleware = isVercel ? uploadMemory.single('image') : uploadLocal.single('image');
  middleware(req, res, async function (err) {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '未上传文件' });

    if (isVercel) {
      try {
        var blobMod = getBlob();
        var safeName = Date.now() + '-' + req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        var result = await blobMod.put('images/' + safeName, req.file.buffer, {
          access: 'public',
          addRandomSuffix: false,
          contentType: req.file.mimetype,
        });
        res.json({ message: '上传成功', path: result.url, filename: safeName });
      } catch (uploadErr) {
        res.status(500).json({ error: '上传失败: ' + uploadErr.message });
      }
    } else {
      res.json({
        message: '上传成功',
        path: 'images/' + req.file.filename,
        filename: req.file.filename
      });
    }
  });
});

app.get('/api/images', authMiddleware, async function (req, res) {
  if (isVercel) {
    try {
      var blobMod = getBlob();
      var result = await blobMod.list({ prefix: 'images/' });
      var files = result.blobs.map(function (b) {
        return { name: b.pathname.replace('images/', ''), path: b.url, size: b.size };
      });
      res.json(files);
    } catch (_e) {
      res.json([]);
    }
  } else {
    var imagesDir = path.join(__dirname, 'images');
    if (!fs.existsSync(imagesDir)) return res.json([]);
    var files = fs.readdirSync(imagesDir)
      .filter(function (f) { return /\.(jpg|jpeg|png|gif|webp)$/i.test(f); })
      .map(function (f) {
        return { name: f, path: 'images/' + f, size: fs.statSync(path.join(imagesDir, f)).size };
      });
    res.json(files);
  }
});

app.delete('/api/images/:filename', authMiddleware, async function (req, res) {
  var filename = req.params.filename;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: '非法文件名' });
  }

  if (isVercel) {
    try {
      var blobMod = getBlob();
      var result = await blobMod.list({ prefix: 'images/' + filename });
      var exact = result.blobs.find(function (b) { return b.pathname === 'images/' + filename; });
      if (!exact) return res.status(404).json({ error: '文件不存在' });
      await blobMod.del(exact.url);
      res.json({ message: '删除成功' });
    } catch (delErr) {
      res.status(500).json({ error: '删除失败: ' + delErr.message });
    }
  } else {
    var filePath = path.join(__dirname, 'images', filename);
    var imagesDir = path.join(__dirname, 'images');
    if (!path.resolve(filePath).startsWith(path.resolve(imagesDir))) {
      return res.status(400).json({ error: '非法路径' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    fs.unlinkSync(filePath);
    res.json({ message: '删除成功' });
  }
});

// ========== START SERVER (local dev only) ==========

if (!isVercel) {
  app.listen(PORT, function () {
    console.log('\n  LuMin Group 网站管理服务器已启动');
    console.log('  前台: http://localhost:' + PORT);
    console.log('  后台: http://localhost:' + PORT + '/admin/login.html');
    console.log('  默认账号: admin / admin123\n');
  });
}

module.exports = app;
