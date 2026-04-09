const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// JWT secret — MUST set via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

// Simple brute-force protection: track login attempts per IP
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Default admin credentials (password will be hashed on first run)
const ADMIN_FILE = path.join(__dirname, 'data', '_admin.json');

function getAdmin() {
  if (!fs.existsSync(ADMIN_FILE)) {
    const hash = bcrypt.hashSync('admin123', 10);
    const admin = { username: 'admin', password: hash };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), 'utf-8');
    return admin;
  }
  return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Block access to sensitive files
app.use('/data/_admin.json', (req, res) => res.status(403).end());
app.use('/data/_admin.json', (req, res) => res.status(403).end());

// Serve static files
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html'],
  dotfiles: 'deny'
}));

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权访问' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

// Image upload config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('不支持的文件格式（仅支持 jpg/png/gif/webp）'));
    }
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// ========== AUTH ROUTES ==========

app.post('/api/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const attempts = loginAttempts.get(ip);

  // Check rate limiting
  if (attempts && attempts.count >= MAX_ATTEMPTS && now - attempts.lastAttempt < LOCKOUT_MS) {
    const remaining = Math.ceil((LOCKOUT_MS - (now - attempts.lastAttempt)) / 60000);
    return res.status(429).json({ error: `登录尝试次数过多，请 ${remaining} 分钟后再试` });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  const admin = getAdmin();
  const valid = username === admin.username && bcrypt.compareSync(password, admin.password);

  if (!valid) {
    // Record failed attempt
    const current = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    if (now - current.lastAttempt > LOCKOUT_MS) current.count = 0;
    current.count++;
    current.lastAttempt = now;
    loginAttempts.set(ip, current);
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  // Clear failed attempts on success
  loginAttempts.delete(ip);

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username });
});

app.post('/api/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请填写旧密码和新密码' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少 6 个字符' });
  }

  const admin = getAdmin();
  if (!bcrypt.compareSync(oldPassword, admin.password)) {
    return res.status(401).json({ error: '旧密码错误' });
  }

  admin.password = bcrypt.hashSync(newPassword, 10);
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2), 'utf-8');
  res.json({ message: '密码修改成功' });
});

// ========== DATA ROUTES ==========

const DATA_FILES = ['hero', 'research', 'publications', 'news', 'members', 'about', 'contact', 'site'];

// GET data
app.get('/api/data/:name', (req, res) => {
  const name = req.params.name;
  if (!DATA_FILES.includes(name)) {
    return res.status(404).json({ error: '数据文件不存在' });
  }
  const filePath = path.join(__dirname, 'data', `${name}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '数据文件不存在' });
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  res.json(data);
});

// PUT data (requires auth)
app.put('/api/data/:name', authMiddleware, (req, res) => {
  const name = req.params.name;
  if (!DATA_FILES.includes(name)) {
    return res.status(404).json({ error: '数据文件不存在' });
  }
  const filePath = path.join(__dirname, 'data', `${name}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ message: '保存成功' });
  } catch (err) {
    res.status(500).json({ error: '保存失败: ' + err.message });
  }
});

// ========== IMAGE ROUTES ==========

// Upload image (requires auth)
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  res.json({
    message: '上传成功',
    path: 'images/' + req.file.filename,
    filename: req.file.filename
  });
});

// List images
app.get('/api/images', authMiddleware, (req, res) => {
  const imagesDir = path.join(__dirname, 'images');
  if (!fs.existsSync(imagesDir)) {
    return res.json([]);
  }
  const files = fs.readdirSync(imagesDir)
    .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
    .map(f => ({
      name: f,
      path: 'images/' + f,
      size: fs.statSync(path.join(imagesDir, f)).size
    }));
  res.json(files);
});

// Delete image (requires auth)
app.delete('/api/images/:filename', authMiddleware, (req, res) => {
  const filename = req.params.filename;
  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: '非法文件名' });
  }
  const filePath = path.join(__dirname, 'images', filename);
  // Verify resolved path stays inside images directory
  const imagesDir = path.join(__dirname, 'images');
  if (!path.resolve(filePath).startsWith(path.resolve(imagesDir))) {
    return res.status(400).json({ error: '非法路径' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  fs.unlinkSync(filePath);
  res.json({ message: '删除成功' });
});

// ========== START SERVER ==========

app.listen(PORT, () => {
  console.log(`\n  LuMin Group 网站管理服务器已启动`);
  console.log(`  前台: http://localhost:${PORT}`);
  console.log(`  后台: http://localhost:${PORT}/admin/login.html`);
  console.log(`  默认账号: admin / admin123\n`);
});
