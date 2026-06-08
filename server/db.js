const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'crm.db');
const dataDir = path.join(__dirname, 'data');

let db = null;

async function initDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_banned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      channel TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '打招呼',
      position TEXT DEFAULT '软件测试工程师',
      salary_range TEXT,
      work_location TEXT,
      commute_time TEXT,
      resume_version TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'note',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      round TEXT NOT NULL,
      interview_time TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT '线下面试',
      location TEXT,
      notes TEXT,
      result TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'greeting',
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes (ignore if exist)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status)',
    'CREATE INDEX IF NOT EXISTS idx_interactions_company ON interactions(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_interviews_company ON interviews(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_interviews_time ON interviews(interview_time)',
    'CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id)'
  ];
  indexes.forEach(sql => db.run(sql));

  // Seed default admin
  const adminResult = db.exec("SELECT id FROM users WHERE role = 'admin'");
  if (adminResult.length === 0 || adminResult[0].values.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@crm.com', hash, 'admin']
    );
    console.log('✅ Default admin created: admin / admin123');
  }

  // Seed default system tags
  const tagResult = db.exec("SELECT COUNT(*) as cnt FROM tags WHERE type = 'system'");
  const tagCount = tagResult[0].values[0][0];
  if (tagCount === 0) {
    const systemTags = [
      '双休', '单休', '大小周', '外包', '试用期八折',
      '试用期全薪', '五险一金', '六险一金', '加班多',
      '弹性工时', '远程办公', '餐补', '交通补贴',
      '年终奖', '期权/股票', '避雷', '推荐'
    ];
    for (const tag of systemTags) {
      db.run('INSERT INTO tags (name, type) VALUES (?, ?)', [tag, 'system']);
    }
    console.log('✅ Default system tags seeded');
  }

  // Seed default system templates
  const tplResult = db.exec('SELECT COUNT(*) as cnt FROM templates WHERE is_system = 1');
  const tplCount = tplResult[0].values[0][0];
  if (tplCount === 0) {
    const systemTemplates = [
      {
        title: '打招呼模板',
        content: '你好 {name}，我是来应聘{position}岗位的，方便看下我的简历吗？',
        category: 'greeting'
      },
      {
        title: '跟进模板',
        content: '{name} 您好，之前投递的{position}岗位，想跟进一下进展，请问简历有在审核吗？',
        category: 'follow_up'
      },
      {
        title: '感谢模板',
        content: '{name} 您好，感谢今天的面试机会，期待后续的消息，谢谢！',
        category: 'thank_you'
      }
    ];
    for (const t of systemTemplates) {
      db.run(
        'INSERT INTO templates (title, content, category, is_system) VALUES (?, ?, ?, 1)',
        [t.title, t.content, t.category]
      );
    }
    console.log('✅ Default system templates seeded');
  }

  // Save to disk
  saveDatabase();

  console.log('✅ Database initialized at:', DB_PATH);
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Helper functions to mimic better-sqlite3 API
function getDb() {
  return db;
}

// Prepare-like helper: returns an object with get(), all(), run() methods
function prepare(sql) {
  return {
    get(...params) {
      try {
        const stmt = db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      } catch (e) {
        console.error('SQL get error:', sql, params, e.message);
        throw e;
      }
    },
    all(...params) {
      try {
        const results = [];
        const stmt = db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (e) {
        console.error('SQL all error:', sql, params, e.message);
        throw e;
      }
    },
    run(...params) {
      try {
        db.run(sql, params);
        const lastId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
        const changes = db.getRowsModified();
        saveDatabase();
        return { lastInsertRowid: lastId, changes };
      } catch (e) {
        console.error('SQL run error:', sql, params, e.message);
        throw e;
      }
    }
  };
}

function execSql(sql) {
  db.run(sql);
  saveDatabase();
}

module.exports = { initDatabase, getDb, prepare, execSql, saveDatabase };
